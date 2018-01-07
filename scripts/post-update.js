#!/usr/bin/env node

const colors = require('colors/safe')
const uploader = require('../src/uploader')

console.log(colors.gray('Scanning for readings...'))

uploader.scanAndUpload()
  .then(record => {
    console.log('Uploaded ' + colors.green(record.size) + ' sensor readings')
    process.exit()
  })
  .catch(error => {
    console.error(colors.red('An error occurred:'), error)
    process.exit(1)
  })
