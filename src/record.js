
class Record {
  constructor(timestamp = null) {
    this.timestamp = timestamp || new Date()
    this._readings = new Map()
  }

  add(reading) {
    this._readings.set(reading.name, reading)
    return reading.name
  }

  get(name) {
    return this._readings.get(name)
  }

  get size() {
    return this._readings.size
  }

  [Symbol.iterator]() {
    return this._readings[Symbol.iterator]()
  }
}

module.exports = Record
