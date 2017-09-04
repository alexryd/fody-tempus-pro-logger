const colors = require('colors/safe')
const commandLineCommands = require('command-line-commands')
const moment = require('moment')
const prompt = require('prompt')
const WeatherStation = require('../src/weather-station')

const scan = () => {
  console.log(colors.gray('Scanning...'))
  console.log(colors.gray('Press Enter to stop scanning'))

  const stdin = process.stdin
  const stdinHandler = char => {
    if (char === '\u0003') {  // Ctrl+C
      process.exit()
    } else if (char === '\u000d') { // Enter
      stdin.setRawMode(false)
      stdin.removeListener('data', stdinHandler)

      WeatherStation.stopScan()
    } else {
      process.stdout.write(char)
    }
  }

  stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding('utf-8')
  stdin.on('data', stdinHandler)

  let numStations = 0

  const discoverHandler = station => {
    if (numStations === 0) {
      console.log('')
      console.log('Found weather stations:')
    }

    const message = [
      colors.green(++numStations),
      ': ',
      station.localName,
      ' (',
      station.address,
      ')'
    ]
    console.log(message.join(''))
  }

  return WeatherStation.scan(discoverHandler)
}

const selectStation = stations => {
  return new Promise((resolve, reject) => {
    if (stations.length === 1) {
      console.log('')
      resolve(stations[0])
    } else if (stations.length > 1) {
      console.log('')
      prompt.start()
      prompt.message = ''
      prompt.get(
        [{
          name: 'station',
          description: colors.green('Select a weather station (1-' + stations.length + ')'),
          type: 'number',
        }],
        (err, result) => {
          if (!err) {
            const num = result.station
            if (num >= 1 && num <= stations.length) {
              resolve(stations[num - 1])
            } else {
              console.error(colors.red('Invalid number:'), num)
              process.exit(1)
            }
          }
        }
      )
    } else {
      process.exit()
    }
  })
}

const synchronizeTime = station => {
  console.log('Synchronizing time...')

  const data = Buffer.alloc(6)
  const dateString = moment().format('YYMMDDHHmm')
  data.writeUInt8(0xaa)
  data.write(dateString, 1, dateString.length, 'hex')

  station.write(data, 0xfd)
    .then(() => {
      console.log('Time successfully synchronized')
      process.exit()
    })
    .catch(error => {
      console.error(colors.red('Time synchronization failed:', error))
      process.exit(1)
    })
}

const addSensors = station => {
  console.log('Searching for sensors...')

  station.write(Buffer.from([0xa3]), 0xde)
    .then(responseData => {
      let numSensors = 0
      for (const n of responseData.slice(1, 4)) {
        if (n !== 0) {
          numSensors++
        }
      }
      console.log(numSensors + ' sensor(s) added')
      process.exit()
    })
    .catch(error => {
      console.error(colors.red('Failed to add sensors:', error))
      process.exit(1)
    })
}

const removeSensors = station => {
  console.log('Removing all sensors...')

  station.write(Buffer.from([0xd0]), 0xde)
    .then(station.write(Buffer.from([0xd1]), 0xde))
    .then(station.write(Buffer.from([0xd2]), 0xde))
    .then(station.write(Buffer.from([0xd3]), 0xde))
    .then(() => {
      console.log('All sensors have been removed')
      process.exit()
    })
    .catch(error => {
      console.error(colors.red('Failed to remove sensors:', error))
      process.exit(1)
    })
}

const reset = station => {
  console.log('Resetting...');

  station.write(Buffer.from([0xc1]), null)
    .then(() => {
      console.log('Reset complete')
      process.exit()
    })
    .catch(error => {
      console.error(colors.red('Failed to reset the device:', error))
      process.exit(1)
    })
}

const validCommands = [
  'time-sync',
  'add-sensors',
  'remove-sensors',
  'reset'
]
const { command } = commandLineCommands(validCommands.concat([null]))

if (command === null) {
  console.log('usage: manage.js <command>')
  console.log('')
  console.log('Valid commands are:', validCommands.join(', '))
  process.exit()
} else {
  let station = null

  scan()
    .then(selectStation)
    .then((s) => {
      station = s
      console.log(colors.gray('Connecting...'))
      return station.connect()
    })
    .then(() => {
      if (command === 'time-sync') {
        synchronizeTime(station)
      } else if (command === 'add-sensors') {
        addSensors(station)
      } else if (command === 'remove-sensors') {
        removeSensors(station)
      } else if (command === 'reset') {
        reset(station)
      }
    })
    .catch(error => {
      console.error(colors.red('An error occurred:'), error)
      process.exit(1)
    })
}
