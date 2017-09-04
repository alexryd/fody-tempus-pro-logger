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

    switch (data.readUInt8(0)) {
    case 0xe0:
      readings.push(new Reading(
        'indoor',
        'temperature',
        parseTemperature(data, 1)
      ))
      readings.push(new Reading(
        'indoor',
        'humidity',
        parseHumidity(data, 8)
      ))
      break

    case 0xa2:
      readings.push(new Reading(
        'indoor',
        'barometric-pressure',
        parseBarometricPressure(data, 2)
      ))
      break

    case 0x01:
      readings.push(new Reading(
        'outdoor',
        'temperature',
        parseTemperature(data, 1)
      ))
      readings.push(new Reading(
        'outdoor',
        'humidity',
        parseHumidity(data, 8)
      ))
      break

    case 0xb2:
      readings.push(new Reading(
        'outdoor',
        'wind-direction',
        parseWindDirection(data, 1)
      ))
      readings.push(new Reading(
        'outdoor',
        'average-wind-speed',
        parseWindSpeed(data, 2)
      ))
      readings.push(new Reading(
        'outdoor',
        'wind-gust-speed',
        parseWindSpeed(data, 5)
      ))
      break

    case 0xb3:
      readings.push(new Reading(
        'outdoor',
        'rainfall',
        parseRainfall(data, 1)
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
