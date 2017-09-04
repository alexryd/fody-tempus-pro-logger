const M2X = require('m2x')

class M2XWrapper {
  constructor(apiKey, deviceId) {
    this.m2x = new M2X(apiKey)
    this.deviceId = deviceId
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
}

module.exports = M2XWrapper
