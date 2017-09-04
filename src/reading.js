const parseTemperature = (data, position) => {
  const n = parseInt(data.toString('hex', position, position + 2))
  return (n - 1000) / 10
}

const parseHumidity = (data, position) => {
  return parseInt(data.toString('hex', position, position + 1))
}

const parseBarometricPressure = (data, position) => {
  return parseInt(data.toString('hex', position, position + 2))
}

const parseWindDirection = (data, position) => {
  return (data.readUInt8(position) - 0x1) / 0x100 * 360
}

const parseWindSpeed = (data, position) => {
  return parseInt(data.toString('hex', position, position + 2)) / 100
}

const parseRainfall = (data, position) => {
  return parseInt(data.toString('hex', position, position + 3)) / 100
}

class Reading {
  static parseReadings(data) {
    const readings = []

    switch (data.readUInt8(8)) {
    case 0xe0:
      readings.push(new Reading(
        'indoor',
        'temperature',
        parseTemperature(data, 9)
      ))
      readings.push(new Reading(
        'indoor',
        'humidity',
        parseHumidity(data, 16)
      ))
      break

    case 0xa2:
      readings.push(new Reading(
        'indoor',
        'barometricPressure',
        parseBarometricPressure(data, 10)
      ))
      break

    case 0x01:
      readings.push(new Reading(
        'outdoor',
        'temperature',
        parseTemperature(data, 9)
      ))
      readings.push(new Reading(
        'outdoor',
        'humidity',
        parseHumidity(data, 16)
      ))
      break

    case 0xb2:
      readings.push(new Reading(
        'outdoor',
        'windDirection',
        parseWindDirection(data, 9)
      ))
      readings.push(new Reading(
        'outdoor',
        'averageWindSpeed',
        parseWindSpeed(data, 10)
      ))
      readings.push(new Reading(
        'outdoor',
        'windGustSpeed',
        parseWindSpeed(data, 13)
      ))
      break

    case 0xb3:
      readings.push(new Reading(
        'outdoor',
        'rainfall',
        parseRainfall(data, 9)
      ))
      break

    case 0xa5:
      // These messages seem to indicate that the time needs to be synchronized.
      // We will ignore them here.
      break

    default:
      console.log('Unknown reading:', data)
    }

    return readings
  }

  constructor(sensor, type, value) {
    this.sensor = sensor
    this.type = type
    this.value = value
  }
}

module.exports = Reading
