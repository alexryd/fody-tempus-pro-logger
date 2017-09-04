const WeatherStation = require('../src/weather-station')

console.log('Listening for readings...')

const readingHandler = reading => {
  console.log(reading.sensor, reading.type, reading.value);
}

WeatherStation.scanForReadings(readingHandler)
  .catch(error => {
    console.error(colors.red('An error occurred:'), error)
    process.exit(1)
  })
