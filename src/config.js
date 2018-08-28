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

  db: {
    path: path.join(path.dirname(__filename), '../data.db'),
  },

  influxdb: {
    database: '',
    host: 'localhost',
    port: 8086,
    protocol: 'http',
    username: '',
    password: '',
    tags: null,
    maxPointsPerWrite: 100,
  },
}

class Config {
  constructor() {
    nconf.argv()
      .env()
      .file(nconf.get('config') || path.join(path.dirname(__filename), '../config.json'))
      .defaults(DEFAULTS)
  }

  get(key) {
    return nconf.get(key)
  }

  set(key, value) {
    nconf.set(key, value)
  }
}

module.exports = new Config()
