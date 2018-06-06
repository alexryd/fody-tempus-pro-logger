const Reading = require('../src/reading')
const should = require('should')

describe('Reading', function() {
  describe('#parseReadings()', function() {
    it('should return an empty array for unknown readings', function() {
      const data = Buffer.from([0x40])
      const readings = Reading.parseReadings(data)
      should(readings).be.instanceOf(Array)
      readings.length.should.equal(0)
    })

    it('should ignore 0xa5 readings', function() {
      const data = Buffer.from([0xa5])
      const readings = Reading.parseReadings(data)
      should(readings).be.instanceOf(Array)
      readings.length.should.equal(0)
    })

    it('should correctly parse an indoor temperature and humidity reading', function() {
      const data = Buffer.from([
        0xe0,
        0x11,
        0x87,
        0x12,
        0x04,
        0x11,
        0x76,
        0x00,
        0x42,
        0x43,
        0x40,
        0x00,
      ])
      const readings = Reading.parseReadings(data)

      readings.length.should.equal(9)

      for (const reading of readings) {
        reading.sensor.should.equal('indoor')
      }

      readings[0].type.should.equal('temperature')
      readings[0].value.should.equal(18.7)

      readings[1].type.should.equal('maximum-temperature')
      readings[1].value.should.equal(20.4)

      readings[2].type.should.equal('minimum-temperature')
      readings[2].value.should.equal(17.6)

      readings[3].type.should.equal('temperature-trend')
      readings[3].value.should.equal(0)

      readings[4].type.should.equal('battery-available')
      readings[4].value.should.equal(true)

      readings[5].type.should.equal('humidity')
      readings[5].value.should.equal(42)

      readings[6].type.should.equal('maximum-humidity')
      readings[6].value.should.equal(43)

      readings[7].type.should.equal('minimum-humidity')
      readings[7].value.should.equal(40)

      readings[8].type.should.equal('humidity-trend')
      readings[8].value.should.equal(0)
    })

    it('should correctly parse an indoor barometric pressure reading', function() {
      const data = Buffer.from([
        0xa2,
        0x20,
        0x09,
        0x70,
        0x00,
        0x00,
        0xff,
        0xff,
        0x0f,
        0xff,
        0xff,
        0xff,
      ])
      const readings = Reading.parseReadings(data)

      readings.length.should.equal(3)

      for (const reading of readings) {
        reading.sensor.should.equal('indoor')
      }

      readings[0].type.should.equal('weather')
      readings[0].value.should.equal('partly-cloudy')

      readings[1].type.should.equal('barometric-pressure-trend')
      readings[1].value.should.equal(0)

      readings[2].type.should.equal('barometric-pressure')
      readings[2].value.should.equal(970)
    })

    it('should correctly parse an outdoor temperature and humidity reading', function() {
      const data = Buffer.from([
        0x01,
        0x11,
        0x09,
        0x11,
        0x10,
        0x10,
        0x12,
        0x00,
        0x39,
        0x68,
        0x39,
        0x05,
      ])
      const readings = Reading.parseReadings(data)

      readings.length.should.equal(10)

      for (const reading of readings) {
        reading.sensor.should.equal('outdoor')
      }

      readings[0].type.should.equal('temperature')
      readings[0].value.should.equal(10.9)

      readings[1].type.should.equal('maximum-temperature')
      readings[1].value.should.equal(11.0)

      readings[2].type.should.equal('minimum-temperature')
      readings[2].value.should.equal(1.2)

      readings[3].type.should.equal('temperature-trend')
      readings[3].value.should.equal(0)

      readings[4].type.should.equal('battery-available')
      readings[4].value.should.equal(true)

      readings[5].type.should.equal('humidity')
      readings[5].value.should.equal(39)

      readings[6].type.should.equal('maximum-humidity')
      readings[6].value.should.equal(68)

      readings[7].type.should.equal('minimum-humidity')
      readings[7].value.should.equal(39)

      readings[8].type.should.equal('humidity-trend')
      readings[8].value.should.equal(0)

      readings[9].type.should.equal('signal-strength')
      readings[9].value.should.equal(5)
    })

    it('should correctly parse an outdoor wind and rainfall reading', function() {
      const data = Buffer.from([
        0xb2,
        0x91,
        0x00,
        0x40,
        0x11,
        0x00,
        0x00,
        0x20,
        0x00,
        0x00,
        0x0f,
      ])
      const readings = Reading.parseReadings(data)

      readings.length.should.equal(6)

      for (const reading of readings) {
        reading.sensor.should.equal('outdoor')
      }

      readings[0].type.should.equal('wind-direction')
      readings[0].value.should.equal(202.5)

      readings[1].type.should.equal('wind-speed')
      readings[1].value.should.equal(0.4)

      readings[2].type.should.equal('maximum-wind-speed')
      readings[2].value.should.equal(1.1)

      readings[3].type.should.equal('gust-speed')
      readings[3].value.should.equal(0)

      readings[4].type.should.equal('maximum-gust-speed')
      readings[4].value.should.equal(2.0)

      readings[5].type.should.equal('hourly-rainfall')
      readings[5].value.should.equal(0)
    })

    it('should correctly parse an outdoor rainfall reading', function() {
      const data = Buffer.from([
        0xb3,
        0x00,
        0x00,
        0x00,
        0x00,
        0x04,
        0x00,
        0x00,
        0x60,
        0x00,
        0x08,
      ])
      const readings = Reading.parseReadings(data)

      readings.length.should.equal(4)

      for (const reading of readings) {
        reading.sensor.should.equal('outdoor')
      }

      readings[0].type.should.equal('daily-rainfall')
      readings[0].value.should.equal(0)

      readings[1].type.should.equal('weekly-rainfall')
      readings[1].value.should.equal(0.4)

      readings[2].type.should.equal('monthly-rainfall')
      readings[2].value.should.equal(0.6)

      readings[3].type.should.equal('yearly-rainfall')
      readings[3].value.should.equal(0.8)
    })
  })
})
