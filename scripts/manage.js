const colors = require('colors/safe')
const commandLineCommands = require('command-line-commands')
const moment = require('moment')
const noble = require('noble')
const prompt = require('prompt')
const WeatherStation = require('../src/weather-station')

const SERVICE_UUID = 'fff0'

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

const synchronizeTime = station => {
  console.log('Synchronizing time...')

  const data = Buffer.alloc(6)
  const dateString = moment().format('YYMMDDHHmm')
  data.writeUInt8(0xaa)
  data.write(dateString, 1, dateString.length, 'hex')

  station.write(data, 0xfd)
    .then(() => {
      console.log('Time successfully synchronized')
      process.exit()
    })
    .catch(error => {
      console.error(colors.red('Time synchronization failed:', error))
      process.exit(1)
    })
}

const addSensors = station => {
  console.log('Searching for sensors...')

  station.write(Buffer.from([0xa3]), 0xde)
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

const removeSensors = station => {
  console.log('Removing all sensors...')

  station.write(Buffer.from([0xd0]), 0xde)
    .then(station.write(Buffer.from([0xd1]), 0xde))
    .then(station.write(Buffer.from([0xd2]), 0xde))
    .then(station.write(Buffer.from([0xd3]), 0xde))
    .then(() => {
      console.log('All sensors have been removed')
      process.exit()
    })
    .catch(error => {
      console.error(colors.red('Failed to remove sensors:', error))
      process.exit(1)
    })
}

const reset = station => {
  console.log('Resetting...');

  station.write(Buffer.from([0xc1]), null)
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
  let station = null

  powerOn()
    .then(scan)
    .then(selectPeripheral)
    .then((peripheral) => {
      station = new WeatherStation(peripheral)
      console.log(colors.gray('Connecting...'))
      return station.connect()
    })
    .then(() => {
      if (command === 'time-sync') {
        synchronizeTime(station)
      } else if (command === 'add-sensors') {
        addSensors(station)
      } else if (command === 'remove-sensors') {
        removeSensors(station)
      } else if (command === 'reset') {
        reset(station)
      }
    })
    .catch(error => {
      console.error(colors.red('An error occurred:'), error)
      process.exit(1)
    })
}
