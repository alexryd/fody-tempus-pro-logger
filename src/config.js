const nconf = require('nconf')
const path = require('path')

const DEFAULTS = {
  schedule: '*/15 * * * *',

  sensor: {
    addresses: [],
    readings: [
      'indoor-barometric-pressure',
      'indoor-humidity',
      'indoor-temperature',
      'outdoor-gust-speed',
      'outdoor-hourly-rainfall',
      'outdoor-humidity',
      'outdoor-temperature',
      'outdoor-wind-direction',
      'outdoor-wind-speed',
    ],
    readTimeout: 10000,
  },

  m2x: {
    apiKey: '',
    deviceId: '',
  }
}

class Config {
  constructor() {
    nconf.argv()
      .env()
      .file({ file: path.join(__dirname, '..', 'config.json') })
      .defaults(DEFAULTS)
  }

  get(key) {
    return nconf.get(key)
  }
}

module.exports = new Config()
