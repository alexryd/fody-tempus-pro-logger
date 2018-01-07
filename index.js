#!/usr/bin/env node

const colors = require('colors/safe')
const config = require('./src/config')
const cron = require('node-cron')
const uploader = require('./src/uploader')

const schedule = config.get('schedule')

if (!cron.validate(schedule)) {
  console.error(colors.red('Invalid schedule:'), schedule)
  process.exit(1)
}

cron.schedule(schedule, () => {
  uploader.scanAndUpload()
    .then(readings => {
      console.log('Uploaded ' + colors.green(readings.size) + ' sensor readings')
    })
    .catch(error => {
      console.error(colors.red('An error occurred:'), error)
    })
})

console.log('Fody Tempus Pro logger started')
