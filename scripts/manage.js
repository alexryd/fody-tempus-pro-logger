const colors = require('colors/safe')
const commandLineCommands = require('command-line-commands')
const moment = require('moment')
const noble = require('noble')
const prompt = require('prompt')

const SERVICE_UUID = 'fff0'

const SETTINGS_WRITE_CHARACTERISTIC_UUID = 'fff1'
const SETTINGS_NOTIFY_CHARACTERISTIC_UUID = 'fff2'
const WRITE_CHARACTERISTIC_UUID = 'fff3'
const NOTIFY_CHARACTERISTIC_UUID = 'fff4'

const powerOn = () => {
  if (noble.state === 'poweredOn') {
    return Promise.resolve()
  }

  console.log(colors.gray('Waiting for power on...'))

  return new Promise((resolve, reject) => {
    const stateChangeHandler = state => {
      if (state === 'poweredOn') {
        noble.removeListener('stateChange', stateChangeHandler)
        resolve()
      }
    }

    noble.on('stateChange', stateChangeHandler)
  })
}

const scan = () => {
  console.log(colors.gray('Scanning...'))

  return new Promise((resolve, reject) => {
    const peripherals = []

    const discoverHandler = peripheral => {
      if (peripherals.length === 0) {
        console.log('')
        console.log('Found peripherals:')
      }

      peripherals.push(peripheral)

      const message = [
        colors.green(peripherals.length),
        ': ',
        peripheral.advertisement.localName,
        ' (',
        peripheral.address,
        ')'
      ]
      console.log(message.join(''))
    }

    const stateChangeHandler = state => {
      if (state !== 'poweredOn') {
        noble.removeListener('discover', discoverHandler)
        noble.removeListener('stateChange', stateChangeHandler)
        noble.stopScanning()
        reject(new Error('State changed to ' + state))
      }
    }

    noble.startScanning([SERVICE_UUID], false, error => {
      if (error) {
        reject(error)
        return
      }

      const stdin = process.stdin
      const stdinHandler = char => {
        if (char === '\u0003') {  // Ctrl+C
          process.exit()
        } else if (char === '\u000d') { // Enter
          stdin.setRawMode(false)
          stdin.removeListener('data', stdinHandler)

          noble.removeListener('discover', discoverHandler)
          noble.removeListener('stateChange', stateChangeHandler)
          noble.stopScanning()

          resolve(peripherals)
        } else {
          process.stdout.write(char)
        }
      }

      stdin.setRawMode(true)
      stdin.resume()
      stdin.setEncoding('utf-8')
      stdin.on('data', stdinHandler)

      noble.on('discover', discoverHandler)
      noble.on('stateChange', stateChangeHandler)

      console.log(colors.gray('Press Enter to stop scanning'))
    })
  })
}

const selectPeripheral = peripherals => {
  return new Promise((resolve, reject) => {
    if (peripherals.length === 1) {
      console.log('')
      resolve(peripherals[0])
    } else if (peripherals.length > 1) {
      console.log('')
      prompt.start()
      prompt.message = ''
      prompt.get(
        [{
          name: 'peripheral',
          description: colors.green('Select a peripheral (1-' + peripherals.length + ')'),
          type: 'number',
        }],
        (err, result) => {
          if (!err) {
            const num = result.peripheral
            if (num >= 1 && num <= peripherals.length) {
              resolve(peripherals[num - 1])
            } else {
              console.error(colors.red('Invalid number:'), num)
              process.exit(1)
            }
          }
        }
      )
    } else {
      process.exit()
    }
  })
}

const connect = peripheral => {
  if (peripheral.state === 'connected') {
    return Promise.resolve(peripheral)
  }

  console.log(colors.gray('Connecting...'))

  return new Promise((resolve, reject) => {
    peripheral.connect(error => {
      if (error) {
        reject(error)
        return
      }

      resolve(peripheral)
    })
  })
}

const discoverCharacteristics = peripheral => {
  return new Promise((resolve, reject) => {
    const disconnectHandler = () => {
      reject(new Error('Peripheral disconnected unexpectedly'))
    }
    peripheral.once('disconnect', disconnectHandler)

    peripheral.discoverSomeServicesAndCharacteristics([SERVICE_UUID], [], (error, services, characteristics) => {
      peripheral.removeListener('disconnect', disconnectHandler)

      if (error) {
        reject(error)
      } else {
        resolve({ peripheral, characteristics })
      }
    })
  })
}

class Device {
  constructor(peripheral, characteristics) {
    this.peripheral = peripheral
    this.settingsWriteCharacteristic = characteristics.find(c => c.uuid === SETTINGS_WRITE_CHARACTERISTIC_UUID)
    this.settingsNotifyCharacteristic = characteristics.find(c => c.uuid === SETTINGS_NOTIFY_CHARACTERISTIC_UUID)
    this.writeCharacteristic = characteristics.find(c => c.uuid === WRITE_CHARACTERISTIC_UUID)
    this.notifyCharacteristic = characteristics.find(c => c.uuid === NOTIFY_CHARACTERISTIC_UUID)
  }

  setupListeners() {
    return new Promise((resolve, reject) => {
      this.settingsNotifyCharacteristic.subscribe(error => {
        if (error) {
          reject(error)
        } else {
          this.notifyCharacteristic.subscribe(error2 => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        }
      })
    })
  }

  writeSetting(data, responseCommand) {
    return new Promise((resolve, reject) => {
      const dataHandler = (receivedData, isNotification) => {
        if (isNotification && receivedData.readUInt8(0) === responseCommand) {
          this.settingsNotifyCharacteristic.removeListener('data', dataHandler)
          resolve(receivedData)
        }
      }
      this.settingsNotifyCharacteristic.on('data', dataHandler)

      this.settingsWriteCharacteristic.write(data, false, error => {
        if (error) {
          this.settingsNotifyCharacteristic.removeListener('data', dataHandler)
          reject(error)
        }
      })
    })
  }

  write(data, responseCommand) {
    return new Promise((resolve, reject) => {
      const dataHandler = (receivedData, isNotification) => {
        if (isNotification && receivedData.readUInt8(0) === responseCommand) {
          this.notifyCharacteristic.removeListener('data', dataHandler)
          resolve(receivedData)
        }
      }
      this.notifyCharacteristic.on('data', dataHandler)

      this.writeCharacteristic.write(data, false, error => {
        if (error) {
          this.notifyCharacteristic.removeListener('data', dataHandler)
          reject(error)
        }
      })
    })
  }
}

const initialize = ({ peripheral, characteristics }) => {
  return new Promise((resolve, reject) => {
    const disconnectHandler = () => {
      reject(new Error('Peripheral disconnected unexpectedly'))
    }
    peripheral.once('disconnect', disconnectHandler)

    const device = new Device(peripheral, characteristics)

    device.setupListeners()
      // Not sure was this does...
      .then(device.writeSetting(
        Buffer.from([0x6, 0x6, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30]),
        0x80
      ))
      // Not sure was this does...
      .then(device.writeSetting(
        Buffer.from([0x5, 0x6, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30]),
        0x80
      ))
      // Not sure was this does...
      .then(device.writeSetting(
        Buffer.from([0xaa, 0x2, 0x33, 0xff]),
        0x80
      ))
      .then(() => {
        peripheral.removeListener('disconnect', disconnectHandler)
        resolve(device)
      })
      .catch(error => {
        peripheral.removeListener('disconnect', disconnectHandler)
        reject(error)
      })
  })
}

const synchronizeTime = device => {
  console.log('Synchronizing time...')

  const data = Buffer.alloc(6)
  const dateString = moment().format('YYMMDDHHmm')
  data.writeUInt8(0xaa)
  data.write(dateString, 1, dateString.length, 'hex')

  device.write(data, 0xfd)
    .then(() => {
      console.log('Time successfully synchronized')
      process.exit()
    })
    .catch(error => {
      console.error(colors.red('Time synchronization failed:', error))
      process.exit(1)
    })
}

const addSensors = device => {
  console.log('Searching for sensors...')

  device.write(Buffer.from([0xa3]), 0xde)
    .then(responseData => {
      let numSensors = 0
      for (const n of responseData.slice(1, 4)) {
        if (n !== 0) {
          numSensors++
        }
      }
      console.log(numSensors + ' sensor(s) added')
      process.exit()
    })
    .catch(error => {
      console.error(colors.red('Failed to add sensors:', error))
      process.exit(1)
    })
}

const removeSensors = device => {
  console.log('Removing all sensors...')

  device.write(Buffer.from([0xd0]), 0xde)
    .then(device.write(Buffer.from([0xd1]), 0xde))
    .then(device.write(Buffer.from([0xd2]), 0xde))
    .then(device.write(Buffer.from([0xd3]), 0xde))
    .then(() => {
      console.log('All sensors have been removed')
      process.exit()
    })
    .catch(error => {
      console.error(colors.red('Failed to remove sensors:', error))
      process.exit(1)
    })
}

const reset = device => {
  console.log('Resetting...');

  device.write(Buffer.from([0xc1]), null)
    .then(() => {
      console.log('Reset complete')
      process.exit()
    })
    .catch(error => {
      console.error(colors.red('Failed to reset the device:', error))
      process.exit(1)
    })
}

const validCommands = [
  'time-sync',
  'add-sensors',
  'remove-sensors',
  'reset'
]
const { command } = commandLineCommands(validCommands.concat([null]))

if (command === null) {
  console.log('usage: manage.js <command>')
  console.log('')
  console.log('Valid commands are:', validCommands.join(', '))
  process.exit()
} else {
  powerOn()
    .then(scan)
    .then(selectPeripheral)
    .then(connect)
    .then(discoverCharacteristics)
    .then(initialize)
    .then(device => {
      if (command === 'time-sync') {
        synchronizeTime(device)
      } else if (command === 'add-sensors') {
        addSensors(device)
      } else if (command === 'remove-sensors') {
        removeSensors(device)
      } else if (command === 'reset') {
        reset(device)
      }
    })
    .catch(error => {
      console.error(colors.red('An error occurred:'), error)
      process.exit(1)
    })
}
