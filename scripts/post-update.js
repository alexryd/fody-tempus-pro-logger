#!/usr/bin/env node

const colors = require('colors/safe')
const config = require('../src/config');
const uploader = require('../src/uploader')
const WeatherStation = require('../src/weather-station')

console.log(colors.gray('Scanning for readings...'))

WeatherStation.getRecord(
  config.get('sensor:readings'),
  config.get('sensor:readTimeout'),
  config.get('sensor:addresses')
)
  .then(record => {
    console.log('Found', colors.green(record.size), 'sensor readings')

    if (record.size === 0) {
      console.log('No readings to upload. Aborting.')
      process.exit()
    }

    return uploader.upload(record, false, false)
  })
  .then(() => {
    console.log('Sensor readings uploaded')
    process.exit()
  })
  .catch(error => {
    console.error(colors.red('An error occurred:'), error)
    process.exit(1)
  })
