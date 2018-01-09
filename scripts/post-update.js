#!/usr/bin/env node

const colors = require('colors/safe')
const uploader = require('../src/uploader')
const WeatherStation = require('../src/weather-station')

console.log(colors.gray('Scanning for readings...'))

WeatherStation.getRecord()
  .then(record => {
    console.log('Found', colors.green(record.size), 'sensor readings')
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
