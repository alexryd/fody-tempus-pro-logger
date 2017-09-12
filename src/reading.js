const INVALID_VALUE = -999
const TEMP_HIGH = -1000
const TEMP_LOW = -1001
const NO_DATA = -1002

const parseTemperature = (data, position) => {
  const s = data[position + 1] & 0xF

  if (s < 10) {
    let n = parseInt(data.toString('hex', position, position + 2))
    n = (n - 1000) / 10
    return n === -100 ? INVALID_VALUE : n
  } else if (s === 0xD) {
    return TEMP_HIGH
  } else if (s === 0xE) {
    return TEMP_LOW
  } else if (s === 0xF) {
    return NO_DATA
  }
  return INVALID_VALUE
}

const parseHumidity = (data, position) => {
  const s = data[position] & 0xF

  if (s < 10) {
    return parseInt(data.toString('hex', position, position + 1))
  } else if (s === 0xD) {
    return TEMP_HIGH
  } else if (s === 0xE) {
    return TEMP_LOW
  } else if (s === 0xF) {
    return NO_DATA
  }
  return INVALID_VALUE
}

const weatherToString = (weather) => {
  switch (weather) {
  case 1:
    return 'sunny'
  case 2:
    return 'partly-cloudy'
  case 3:
    return 'cloudy'
  case 4:
    return 'rainny'
  case 5:
    return 'stormy'
  default:
    return 'sunny'
  }
}

const parseBarometricPressure = (data, position) => {
  const s = data[position + 1] & 0xF

  if (s < 10) {
    return parseInt(data.toString('hex', position, position + 2))
  } else if (s === 0xF) {
    return NO_DATA
  }
  return INVALID_VALUE
}

const parseWindDirection = (data, position) => {
  const b = data[position]

  if (b & 0x1 > 0) {
    return ((b & 0xF0) >> 4) * 22.5
  }
  return INVALID_VALUE
}

const parseWindSpeed = (bits) => {
  const s = bits & 0xF

  if (s < 10) {
    return parseInt(bits.toString(16)) / 10
  } else if (s === 0xF) {
    return NO_DATA
  }
  return INVALID_VALUE
}

const parseRainfall = (hex, position) => {
  const str = hex.substring(position, position + 5)

  if (str === '0000f') {
    return 0
  }

  const num = parseInt(str) / 10
  if (!isNaN(num)) {
    return num
  }
  return INVALID_VALUE
}

class Packet {
  constructor(data) {
    this.data = data

    const sensor = (data[0] & 0xF0) >> 4
    const seq = (data[0] & 0xF) - 1

    switch (sensor) {
    case 0:
    case 1:
    case 2:
    case 3:
      this.channel = sensor
      this.sequence = 0
      break

    case 10:
      this.channel = 14
      this.sequence = seq
      break

    case 11:
    case 12:
    case 13:
      this.channel = sensor - 11
      this.sequence = seq
      break

    case 14:
      this.channel = 14
      this.sequence = 0
      break

    case 15:
      this.channel = 3
      this.sequence = seq
      break

    default:
      break
    }
  }
}

class Reading {
  static parseReadings(data) {
    const packet = new Packet(data)

    switch (packet.channel) {
    case 0:
      return Reading.parseOutdoorReadings(packet)
    case 1:
    case 2:
    case 3:
      return Reading.parseChannelReadings(packet)
    case 14:
      return Reading.parseIndoorReadings(packet)
    default:
      console.log('Unknown channel in packet with data:', packet.data)
      return []
    }
  }

  static parseIndoorReadings(packet) {
    const data = packet.data
    const readings = []

    const addReading = (type, value) => {
      readings.push(new Reading('indoor', type, value))
    }

    let b = null

    switch (packet.sequence) {
    case 0:
      addReading('temperature', parseTemperature(data, 1))
      addReading('maximum-temperature', parseTemperature(data, 3))
      addReading('minimum-temperature', parseTemperature(data, 5))

      b = data[7]
      addReading('temperature-trend', (b & 0x30) >> 4)
      addReading('battery-available', (b & 0xF) === 0)

      addReading('humidity', parseHumidity(data, 8))
      addReading('maximum-humidity', parseHumidity(data, 9))
      addReading('minimum-humidity', parseHumidity(data, 10))
      addReading('humidity-trend', (data[11] & 0x30) >> 4)
      break

    case 1:
      b = data[1]
      addReading('weather', weatherToString((b & 0xF0) >> 4))
      addReading('barometric-pressure-trend', b & 0xF)
      addReading('barometric-pressure', parseBarometricPressure(data, 2))
      break

    case 4:
      // These messages seem to indicate that the time needs to be synchronized.
      // We will ignore them here.
      break

    default:
      console.log('Unknown sequence in packet with data:', data)
    }

    return readings
  }

  static parseOutdoorReadings(packet) {
    const data = packet.data
    const readings = []

    const addReading = (type, value) => {
      readings.push(new Reading('outdoor', type, value))
    }

    let b = null

    switch (packet.sequence) {
    case 0:
      addReading('temperature', parseTemperature(data, 1))
      addReading('maximum-temperature', parseTemperature(data, 3))
      addReading('minimum-temperature', parseTemperature(data, 5))

      b = data[7]
      addReading('temperature-trend', (b & 0x30) >> 4)
      addReading('battery-available', (b & 0xF) === 0)

      addReading('humidity', parseHumidity(data, 8))
      addReading('maximum-humidity', parseHumidity(data, 9))
      addReading('minimum-humidity', parseHumidity(data, 10))

      b = data[11]
      addReading('humidity-trend', (b & 0x30) >> 4)
      addReading('signal-strength', b & 0x7)
      break

    case 1:
      addReading('wind-direction', parseWindDirection(data, 1))
      addReading('wind-speed', parseWindSpeed((data[2] << 4) + ((data[3] & 0xF0) >> 4)))
      addReading('maximum-wind-speed', parseWindSpeed(((data[3] & 0xF) << 8) + data[4]))
      addReading('gust-speed', parseWindSpeed((data[5] << 4) + ((data[6] & 0xF0) >> 4)))
      addReading('maximum-gust-speed', parseWindSpeed(((data[6] & 0xF) << 8) + data[7]))
      addReading('hourly-rainfall', parseRainfall(data.toString('hex', 8, 11), 0))
      break

    case 2:
      const hex = data.toString('hex', 1, 11)
      addReading('daily-rainfall', parseRainfall(hex, 0))
      addReading('weekly-rainfall', parseRainfall(hex, 5))
      addReading('monthly-rainfall', parseRainfall(hex, 10))
      addReading('yearly-rainfall', parseRainfall(hex, 15))
      break

    default:
      console.log('Unknown sequence in packet with data:', data)
    }

    return readings
  }

  static parseChannelReadings(packet) {
    const data = packet.data
    const readings = []

    const addReading = (type, value) => {
      readings.push(new Reading('channel' + packet.channel, type, value))
    }

    let b = null

    switch (packet.sequence) {
    case 0:
      addReading('temperature', parseTemperature(data, 1))
      addReading('maximum-temperature', parseTemperature(data, 3))
      addReading('minimum-temperature', parseTemperature(data, 5))

      b = data[7]
      addReading('temperature-trend', (b & 0x30) >> 4)
      addReading('battery-available', (b & 0xF) === 0)

      addReading('humidity', parseHumidity(data, 8))
      addReading('maximum-humidity', parseHumidity(data, 9))
      addReading('minimum-humidity', parseHumidity(data, 10))

      b = data[11]
      addReading('humidity-trend', (b & 0x30) >> 4)
      addReading('signal-strength', b & 0x7)
      break

    default:
      console.log('Unknown sequence in packet with data:', data)
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
