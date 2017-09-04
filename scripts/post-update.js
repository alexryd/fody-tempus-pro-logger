#!/usr/bin/env node

const colors = require('colors/safe')
const commandLineArgs = require('command-line-args')
const M2X = require('../src/m2x')
const WeatherStation = require('../src/weather-station')

const SENSORS = [
  'indoor-temperature',
  'indoor-humidity',
  'indoor-barometric-pressure',
  'outdoor-temperature',
  'outdoor-humidity',
  'outdoor-wind-direction',
  'outdoor-average-wind-speed',
  'outdoor-wind-gust-speed',
  'outdoor-rainfall',
]

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
} else if (sensor !== 'all' && SENSORS.indexOf(sensor) === -1) {
  console.error(colors.red('Invalid sensor: ' + sensor))
  console.log('Valid values are:', SENSORS.concat(['all']).join(', '))
  process.exit(1)
}

const receivedReadings = new Map()

const postValues = values => {
  console.log(colors.gray('Posting update...'))

  const m2x = new M2X(apiKey, deviceId)

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

const readingHandler = reading => {
  const name = reading.sensor + '-' + reading.type

  if (sensor === 'all' && SENSORS.indexOf(name) !== -1) {
    console.log(colors.gray(name + ': ' + reading.value))

    receivedReadings.set(name, reading.value)

    if (receivedReadings.size >= SENSORS.length) {
      WeatherStation.stopScan()

      const values = {}
      for (const [n, v] of receivedReadings) {
        values[n] = v
      }

      postValues(values)
    }
  } else if (name === sensor) {
    console.log(colors.gray('Received a reading of ' + reading.value))

    WeatherStation.stopScan()

    const values = {}
    values[name] = reading.value

    postValues(values)
  }
}

console.log(colors.gray('Listening for ' + sensor + ' readings...'))

WeatherStation.scanForReadings(readingHandler, normAddresses)
  .catch(error => {
    console.error(colors.red('An error occurred:'), error)
    process.exit(1)
  })
