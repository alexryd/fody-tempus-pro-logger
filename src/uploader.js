const colors = require('colors/safe')
const config = require('./config')
const M2X = require('./m2x')
const Record = require('./record')
const WeatherStation = require('./weather-station')

class Uploader {
  scanAndUpload() {
    return this.scan().then(this.upload.bind(this))
  }

  scan() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log(colors.red('Timed out while listening for sensor readings'))
        WeatherStation.stopScan()
      }, config.get('sensor:readTimeout'))

      const record = new Record()
      const includedReadings = config.get('sensor:readings')

      const readingHandler = reading => {
        if (includedReadings.indexOf(reading.name) !== -1) {
          record.add(reading)

          if (record.size >= includedReadings.length) {
            clearTimeout(timeout)
            WeatherStation.stopScan()
          }
        }
      }

      WeatherStation.scanForReadings(readingHandler, this.addresses)
        .then(() => {
          clearTimeout(timeout)
          resolve(record)
        })
        .catch(error => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  upload(record) {
    return new Promise((resolve, reject) => {
      const m2x = new M2X(
        config.get('m2x:apiKey'),
        config.get('m2x:deviceId')
      )

      const values = {}
      for (const [n, r] of record) {
        values[n] = r.value
      }

      m2x.postUpdate(values)
        .then(() => {
          resolve(record)
        })
        .catch(response => {
          reject(response)
        })
    })
  }

  get addresses() {
    const addresses = config.get('sensor:addresses')
    return addresses && addresses.map(
      address => address.toLowerCase().replace(/:/g, '')
    )
  }
}

module.exports = new Uploader()
