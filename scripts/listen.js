const commandLineArgs = require('command-line-args')
const WeatherStation = require('../src/weather-station')

const { addresses, help } = commandLineArgs([
  { name: 'addresses', type: String, multiple: true, defaultOption: true },
  { name: 'help', alias: 'h', type: Boolean },
])

if (help) {
  console.log('usage: listen.js [<addresses>]')
  process.exit()
}

const readingHandler = reading => {
  console.log(reading.sensor, reading.type, reading.value);
}

const normAddresses = addresses && addresses.map(
  address => address.toLowerCase().replace(/:/g, '')
)

console.log('Listening for readings...')

WeatherStation.scanForReadings(readingHandler, normAddresses)
  .catch(error => {
    console.error(colors.red('An error occurred:'), error)
    process.exit(1)
  })
