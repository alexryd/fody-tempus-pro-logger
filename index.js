#!/usr/bin/env node

const colors = require('colors/safe')
const config = require('./src/config')
const cron = require('node-cron')

const schedule = config.get('schedule')

if (!cron.validate(schedule)) {
  console.error(colors.red('Invalid schedule:'), schedule)
  process.exit(1)
}

cron.schedule(schedule, () => {
  // fetch sensor readings and post them to M2X
})
