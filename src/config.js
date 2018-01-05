const nconf = require('nconf')

const DEFAULTS = {
  schedule: '*/15 * * * *',
}

class Config {
  constructor() {
    nconf.argv()
      .env()
      .file({ file: 'config.json' })
      .defaults(DEFAULTS)
  }

  get(key) {
    return nconf.get(key)
  }
}

module.exports = new Config()
