#!/usr/bin/env node

const colors = require('colors/safe')
const config = require('./src/config')
const cron = require('node-cron')
const uploader = require('./src/uploader')
const WeatherStation = require('./src/weather-station')

const schedule = config.get('schedule')

if (!cron.validate(schedule)) {
  console.error(colors.red('Invalid schedule:'), schedule)
  process.exit(1)
}

cron.schedule(schedule, () => {
  console.log(colors.gray('Scanning for readings...'))

  WeatherStation.getRecord()
    .then(record => {
      console.log('Found', colors.green(record.size), 'sensor readings')
      return uploader.upload(record)
    })
    .then(() => {
      console.log('Sensor readings uploaded')
    })
    .catch(error => {
      console.error(colors.red('An error occurred:'), error)
    })
})

console.log('Fody Tempus Pro logger started')
