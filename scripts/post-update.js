#!/usr/bin/env node

const colors = require('colors/safe')
const commandLineArgs = require('command-line-args')
const M2X = require('../src/m2x')
const WeatherStation = require('../src/weather-station')

const args = commandLineArgs([
  { name: 'addresses', type: String, multiple: true },
  { name: 'api-key', alias: 'k', type: String },
  { name: 'device-id', alias: 'd', type: String },
  { name: 'sensor', alias: 's', type: String, defaultOption: true },
])

const addresses = args['addresses']
const normAddresses = addresses && addresses.map(
  address => address.toLowerCase().replace(/:/g, '')
)

const apiKey = args['api-key']
if (!apiKey) {
  console.error(colors.red('An API key must be specified'))
  process.exit(1)
}

const deviceId = args['device-id']
if (!deviceId) {
  console.error(colors.red('A device ID must be specified'))
  process.exit(1)
}

const sensor = args['sensor']
if (!sensor) {
  console.error(colors.red('A sensor must be specified'))
  process.exit(1)
}

const readingHandler = reading => {
  if (reading.sensor + '-' + reading.type === sensor) {
    WeatherStation.stopScan()

    console.log(colors.gray('Received a reading of ' + reading.value))
    console.log(colors.gray('Posting update...'))

    const m2x = new M2X(apiKey, deviceId)

    const values = {}
    values[sensor] = reading.value

    m2x.postUpdate(values)
      .then(() => {
        console.log('Update posted')
        process.exit()
      })
      .catch(response => {
        console.error(colors.red('An error occurred:'), response)
        process.exit(1)
      })
  }
}

console.log(colors.gray('Listening for ' + sensor + ' readings...'))

WeatherStation.scanForReadings(readingHandler, normAddresses)
  .catch(error => {
    console.error(colors.red('An error occurred:'), error)
    process.exit(1)
  })
