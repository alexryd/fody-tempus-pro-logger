const config = require('./config')
const M2X = require('m2x')

class M2XWrapper {
  constructor(apiKey, deviceId) {
    this.m2x = new M2X(config.get('m2x:apiKey'))
    this.deviceId = config.get('m2x:deviceId')
  }

  postUpdate(values, timestamp) {
    return new Promise((resolve, reject) => {
      const params = { values: values }
      if (timestamp) {
        params.timestamp = timestamp instanceof Date ? timestamp.toISOString() : timestamp
      }

      this.m2x.devices.postUpdate(this.deviceId, params, response => {
        if (response.status === 202) {
          resolve()
        } else {
          reject(response)
        }
      })
    })
  }

  postUpdates(params) {
    return new Promise((resolve, reject) => {
      this.m2x.devices.postUpdates(this.deviceId, params, response => {
        if (response.status === 202) {
          resolve()
        } else {
          reject(response)
        }
      })
    })
  }
}

module.exports = new M2XWrapper()
