const EventEmitter = require('events')

const SERVICE_UUID = 'fff0'

const SETTINGS_WRITE_CHARACTERISTIC_UUID = 'fff1'
const SETTINGS_NOTIFY_CHARACTERISTIC_UUID = 'fff2'
const WRITE_CHARACTERISTIC_UUID = 'fff3'
const NOTIFY_CHARACTERISTIC_UUID = 'fff4'

class WeatherStation extends EventEmitter {
  constructor(peripheral) {
    super()
    this.peripheral = peripheral
  }

  connect() {
    this.emit('connecting')

    return new Promise((resolve, reject) => {
      if (this.peripheral.state === 'connected') {
        resolve()
        return
      }

      this.peripheral.connect(error => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    }).then(() => {
      return this._getCharacteristics()
    }).then(() => {
      return this._setupListeners()
    }).then(() => {
      return this._initialize()
    }).then(() => {
      this.emit('connected')
    })
  }

  _getCharacteristics() {
    return new Promise((resolve, reject) => {
      const disconnectHandler = () => {
        reject(new Error('Peripheral disconnected unexpectedly'))
      }
      this.peripheral.once('disconnect', disconnectHandler)

      this.peripheral.discoverSomeServicesAndCharacteristics(
        [SERVICE_UUID],
        [],
        (error, services, characteristics) => {
          this.peripheral.removeListener('disconnect', disconnectHandler)

          if (error) {
            reject(error)
          } else {
            this.settingsWriteCharacteristic = characteristics.find(
              c => c.uuid === SETTINGS_WRITE_CHARACTERISTIC_UUID
            )
            this.settingsNotifyCharacteristic = characteristics.find(
              c => c.uuid === SETTINGS_NOTIFY_CHARACTERISTIC_UUID
            )
            this.writeCharacteristic = characteristics.find(
              c => c.uuid === WRITE_CHARACTERISTIC_UUID
            )
            this.notifyCharacteristic = characteristics.find(
              c => c.uuid === NOTIFY_CHARACTERISTIC_UUID
            )

            resolve()
          }
        }
      )
    })
  }

  _setupListeners() {
    return new Promise((resolve, reject) => {
      const disconnectHandler = () => {
        reject(new Error('Peripheral disconnected unexpectedly'))
      }
      this.peripheral.once('disconnect', disconnectHandler)

      this.settingsNotifyCharacteristic.subscribe(error => {
        if (error) {
          this.peripheral.removeListener('disconnect', disconnectHandler)
          reject(error)
        } else {
          this.notifyCharacteristic.subscribe(error2 => {
            this.peripheral.removeListener('disconnect', disconnectHandler)
            if (error2) {
              reject(error2)
            } else {
              resolve()
            }
          })
        }
      })
    })
  }

  _initialize() {
    return new Promise((resolve, reject) => {
      const disconnectHandler = () => {
        reject(new Error('Peripheral disconnected unexpectedly'))
      }
      this.peripheral.once('disconnect', disconnectHandler)

      // Not sure was this does...
      this.writeSetting(Buffer.from([0x6, 0x6, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30]), 0x80)
        // Not sure was this does...
        .then(this.writeSetting(Buffer.from([0x5, 0x6, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30]), 0x80))
        // Not sure was this does...
        .then(this.writeSetting(Buffer.from([0xaa, 0x2, 0x33, 0xff]), 0x80))
        .then(() => {
          this.peripheral.removeListener('disconnect', disconnectHandler)
          resolve()
        })
        .catch(error => {
          this.peripheral.removeListener('disconnect', disconnectHandler)
          reject(error)
        })
    })
  }

  writeSetting(data, responseCommand) {
    return this._write(
      this.settingsWriteCharacteristic,
      this.settingsNotifyCharacteristic,
      data,
      responseCommand
    )
  }

  write(data, responseCommand) {
    return this._write(
      this.writeCharacteristic,
      this.notifyCharacteristic,
      data,
      responseCommand
    )
  }

  _write(writeCharacteristic, notifyCharacteristic, data, responseCommand) {
    return new Promise((resolve, reject) => {
      const dataHandler = (receivedData, isNotification) => {
        if (isNotification && receivedData.readUInt8(0) === responseCommand) {
          notifyCharacteristic.removeListener('data', dataHandler)
          resolve(receivedData)
        }
      }
      notifyCharacteristic.on('data', dataHandler)

      writeCharacteristic.write(data, false, error => {
        this.emit('write', data, error)
        if (error) {
          notifyCharacteristic.removeListener('data', dataHandler)
          reject(error)
        }
      })
    })
  }
}

module.exports = WeatherStation
