const EventEmitter = require('events')
const noble = require('noble')
const Reading = require('../src/reading')
const should = require('should')
const sinon = require('sinon')
const WeatherStation = require('../src/weather-station')

describe('WeatherStation', function() {
  let eventEmitter = null
  let emit = null
  let on = null
  let removeListener = null

  beforeEach(function() {
    eventEmitter = new EventEmitter()
    emit = eventEmitter.emit.bind(eventEmitter)
    on = sinon.fake(eventEmitter.on.bind(eventEmitter))
    removeListener = sinon.fake(eventEmitter.removeListener.bind(eventEmitter))

    sinon.stub(noble._bindings, 'init')
    sinon.replace(noble, 'on', on)
    sinon.replace(noble, 'removeListener', removeListener)
  })

  afterEach(function() {
    eventEmitter = null
    emit = null
    on = null
    removeListener = null

    sinon.restore()
  })

  describe('#powerOn()', function() {
    it('should resolve when state is poweredOn', function() {
      const state = noble._state
      noble._state = 'poweredOn'

      return WeatherStation.powerOn().then(function() {
        noble._state = state
        on.called.should.equal(false)
      })
    })

    it('should resolve when state changes to poweredOn', function() {
      const promise = WeatherStation.powerOn().then(function() {
        on.calledWith('stateChange').should.equal(true)
        eventEmitter.eventNames().length.should.equal(0)
      })

      emit('stateChange', 'poweredOn')

      return promise
    })

    it('should time out after 5 seconds', function() {
      const clock = sinon.useFakeTimers()

      const promise = WeatherStation.powerOn().then(
        function() {
          return Promise.reject(new Error('powerOn() unexpectedly succeeded'))
        },
        function(err) {
          clock.now.should.be.aboveOrEqual(5000)
          clock.restore()
        }
      )

      clock.tick(5000)

      return promise
    })
  })

  describe('#scan()', function() {
    it('should fail when startScanning() returns an error', function() {
      const error = new Error('')
      sinon.replace(noble, 'startScanning', sinon.fake.yieldsAsync(error))

      const promise = WeatherStation.scan().then(
        function() {
          return Promise.reject(new Error('scan() unexpectedly succeeded'))
        },
        function(err) {
          err.should.equal(error)
        }
      )

      emit('stateChange', 'poweredOn')

      return promise
    })

    it('should return when scanning stops', function() {
      sinon.replace(noble, 'startScanning', sinon.fake(
        function(u, a, callback) {
          callback(null)
          emit('scanStop')
        }
      ))

      const promise = WeatherStation.scan().then(function(stations) {
        stations.length.should.equal(0)
        eventEmitter.eventNames().length.should.equal(0)
      })

      emit('stateChange', 'poweredOn')

      return promise
    })

    it('should fail when state changes', function() {
      sinon.replace(noble, 'startScanning', sinon.fake(
        function(u, a, callback) {
          callback(null)
          emit('stateChange', 'poweredOff')
        }
      ))
      sinon.replace(noble, 'stopScanning', sinon.stub())

      const promise = WeatherStation.scan().then(
        function() {
          return Promise.reject(new Error('scan() unexpectedly succeeded'))
        },
        function(err) {
          eventEmitter.eventNames().length.should.equal(0)
        }
      )

      emit('stateChange', 'poweredOn')

      return promise
    })

    it('should invoke the callback when stations are discovered', function() {
      const peripheral1 = {
        id: '1',
        address: '123456789abc',
        advertisement: {
          localName: 'Peripheral 1',
        },
      }
      const peripheral2 = {
        id: '2',
        address: '123456789abd',
        advertisement: {
          localName: 'Peripheral 2',
        },
      }
      const discoverHandler = sinon.stub()

      sinon.replace(noble, 'startScanning', sinon.fake(
        function(u, a, callback) {
          callback(null)
          emit('discover', peripheral1)
          emit('discover', peripheral2)
          emit('scanStop')
        }
      ))

      const promise = WeatherStation.scan(discoverHandler)
        .then(function(stations) {
          stations.length.should.equal(2)
          discoverHandler.callCount.should.equal(2)
          discoverHandler.args[0][0].peripheral.should.equal(peripheral1)
          discoverHandler.args[1][0].peripheral.should.equal(peripheral2)
          eventEmitter.eventNames().length.should.equal(0)
        })

      emit('stateChange', 'poweredOn')

      return promise
    })

    it('should ignore peripherals with unspecified addresses', function() {
      const peripheral1 = {
        id: '1',
        address: '123456789abc',
        advertisement: {
          localName: 'Peripheral 1',
        },
      }
      const peripheral2 = {
        id: '2',
        address: '123456789abd',
        advertisement: {
          localName: 'Peripheral 2',
        },
      }
      const discoverHandler = sinon.stub()
      const addresses = [peripheral1.address]

      sinon.replace(noble, 'startScanning', sinon.fake(
        function(u, a, callback) {
          callback(null)
          emit('discover', peripheral1)
          emit('discover', peripheral2)
          emit('scanStop')
        }
      ))

      const promise = WeatherStation.scan(discoverHandler, addresses)
        .then(function(stations) {
          stations.length.should.equal(1)
          discoverHandler.callCount.should.equal(1)
        })

      emit('stateChange', 'poweredOn')

      return promise
    })
  })

  describe('#scanForReadings()', function() {
    it('should fail when startScanning() returns an error', function() {
      const error = new Error('')
      sinon.replace(noble, 'startScanning', sinon.fake.yieldsAsync(error))

      const promise = WeatherStation.scanForReadings().then(
        function() {
          return Promise.reject(
            new Error('scanForReadings() unexpectedly succeeded')
          )
        },
        function(err) {
          err.should.equal(error)
        }
      )

      emit('stateChange', 'poweredOn')

      return promise
    })

    it('should return when scanning stops', function() {
      sinon.replace(noble, 'startScanning', sinon.fake(
        function(u, a, callback) {
          callback(null)
          emit('scanStop')
        }
      ))

      const promise = WeatherStation.scanForReadings().then(function() {
        eventEmitter.eventNames().length.should.equal(0)
      })

      emit('stateChange', 'poweredOn')

      return promise
    })

    it('should fail when state changes', function() {
      sinon.replace(noble, 'startScanning', sinon.fake(
        function(u, a, callback) {
          callback(null)
          emit('stateChange', 'poweredOff')
        }
      ))
      sinon.replace(noble, 'stopScanning', sinon.stub())

      const promise = WeatherStation.scanForReadings().then(
        function() {
          return Promise.reject(
            new Error('scanForReadings() unexpectedly succeeded')
          )
        },
        function(err) {
          eventEmitter.eventNames().length.should.equal(0)
        }
      )

      emit('stateChange', 'poweredOn')

      return promise
    })

    it('should properly handle readings', function() {
      const validAdvertisement = {
        address: '123456789abc',
        advertisement: {
          manufacturerData: Buffer.from([
            0x42, 0x48, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12,
            0xb3, 0x00, 0x00, 0x40, 0x00, 0x04, 0x00, 0x00, 0x40, 0x00, 0x12,
          ]),
        },
      }
      const tooShortAdvertisement = {
        address: '123456789abc',
        advertisement: {
          manufacturerData: Buffer.from([
            0x42, 0x48,
          ]),
        },
      }
      const invalidCompanyIdAdvertisement = {
        address: '123456789abc',
        advertisement: {
          manufacturerData: Buffer.from([
            0x43, 0x48, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12,
            0xb3, 0x00, 0x00, 0x40, 0x00, 0x04, 0x00, 0x00, 0x40, 0x00, 0x12,
          ]),
        },
      }
      const invalidAddressAdvertisement = {
        address: '123456789abd',
        advertisement: {
          manufacturerData: Buffer.from([
            0x42, 0x48, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12,
            0xb3, 0x00, 0x00, 0x40, 0x00, 0x04, 0x00, 0x00, 0x40, 0x00, 0x12,
          ]),
        },
      }
      const readingHandler = sinon.stub()

      sinon.replace(noble, 'startScanning', sinon.fake(
        function(u, a, callback) {
          callback(null)
          emit('discover', validAdvertisement)
          emit('discover', tooShortAdvertisement)
          emit('discover', invalidCompanyIdAdvertisement)
          emit('discover', invalidAddressAdvertisement)
          emit('scanStop')
        }
      ))

      const promise = WeatherStation.scanForReadings(readingHandler)
        .then(function() {
          readingHandler.callCount.should.equal(4)
          for (let i = 0; i < readingHandler.callCount; i++) {
            readingHandler.args[i][0].should.instanceof(Reading)
            readingHandler.args[i][1].should.equal(validAdvertisement)
          }
          eventEmitter.eventNames().length.should.equal(0)
        })

      emit('stateChange', 'poweredOn')

      return promise
    })

    it('should ignore readings from unspecified addresses', function() {
      const advertisement1 = {
        address: '123456789abc',
        advertisement: {
          manufacturerData: Buffer.from([
            0x42, 0x48, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12,
            0xb3, 0x00, 0x00, 0x40, 0x00, 0x04, 0x00, 0x00, 0x40, 0x00, 0x12,
          ]),
        },
      }
      const advertisement2 = {
        address: '123456789abd',
        advertisement: {
          manufacturerData: Buffer.from([
            0x42, 0x48, 0xbd, 0x9a, 0x78, 0x56, 0x34, 0x12,
            0xb3, 0x00, 0x00, 0x40, 0x00, 0x04, 0x00, 0x00, 0x40, 0x00, 0x12,
          ]),
        },
      }
      const readingHandler = sinon.stub()
      const addresses = [advertisement1.address]

      sinon.replace(noble, 'startScanning', sinon.fake(
        function(u, a, callback) {
          callback(null)
          emit('discover', advertisement1)
          emit('discover', advertisement2)
          emit('scanStop')
        }
      ))

      const promise = WeatherStation.scan(readingHandler, addresses)
        .then(function() {
          readingHandler.callCount.should.equal(1)
        })

      emit('stateChange', 'poweredOn')

      return promise
    })
  })

  describe('#stopScan()', function() {
    it('should resolve when scanning has stopped', function() {
      sinon.replace(noble, 'stopScanning', sinon.fake.yieldsAsync())

      return WeatherStation.stopScan().then(function() {
        eventEmitter.eventNames().length.should.equal(0)
      })
    })
  })

  describe('#getRecord()', function() {
    it('should fail when startScanning() returns an error', function() {
      const error = new Error('')
      sinon.replace(noble, 'startScanning', sinon.fake.yieldsAsync(error))

      const promise = WeatherStation.getRecord().then(
        function() {
          return Promise.reject(
            new Error('getRecord() unexpectedly succeeded')
          )
        },
        function(err) {
          err.should.equal(error)
          eventEmitter.eventNames().length.should.equal(0)
        }
      )

      emit('stateChange', 'poweredOn')

      return promise
    })

    it('should time out after the given time', function() {
      const clock = sinon.useFakeTimers()
      const readTimeout = 10000

      sinon.replace(noble, 'startScanning', sinon.fake(
        function(u, a, callback) {
          callback(null)
          clock.tick(readTimeout)
        }
      ))
      sinon.replace(noble, 'stopScanning', sinon.fake(function() {
        emit('scanStop')
      }))

      const promise = WeatherStation.getRecord([], readTimeout)
        .then(function() {
            clock.now.should.be.aboveOrEqual(readTimeout)
            clock.restore()
            eventEmitter.eventNames().length.should.equal(0)
        })

      emit('stateChange', 'poweredOn')

      return promise
    })

    it('should resolve when all readings have been received', function() {
      const includedReadings = [
        'outdoor-daily-rainfall',
        'indoor-temperature',
        'indoor-humidity',
      ]
      const advertisement1 = {
        address: '123456789abc',
        advertisement: {
          manufacturerData: Buffer.from([
            0x42, 0x48, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12,
            0xb3, 0x00, 0x00, 0x40, 0x00, 0x04, 0x00, 0x00, 0x40, 0x00, 0x12,
          ]),
        },
      }
      const advertisement2 = {
        address: '123456789abc',
        advertisement: {
          manufacturerData: Buffer.from([
            0x42, 0x48, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12,
            0xb3, 0x00, 0x00, 0x50, 0x00, 0x04, 0x00, 0x00, 0x40, 0x00, 0x12,
          ]),
        },
      }
      const advertisement3 = {
        address: '123456789abd',
        advertisement: {
          manufacturerData: Buffer.from([
            0x42, 0x48, 0xbd, 0x9a, 0x78, 0x56, 0x34, 0x12,
            0xe0, 0x11, 0x87, 0x12, 0x04, 0x11, 0x76, 0x00, 0x42, 0x43, 0x40,
            0x00,
          ]),
        },
      }
      const advertisement4 = {
        address: '123456789abc',
        advertisement: {
          manufacturerData: Buffer.from([
            0x42, 0x48, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12,
            0xb3, 0x00, 0x00, 0x60, 0x00, 0x04, 0x00, 0x00, 0x40, 0x00, 0x12,
          ]),
        },
      }

      sinon.replace(noble, 'startScanning', sinon.fake(
        function(u, a, callback) {
          callback(null)
          emit('discover', advertisement1)
          emit('discover', advertisement2)
          emit('discover', advertisement3)
          emit('discover', advertisement4)
        }
      ))
      sinon.replace(noble, 'stopScanning', sinon.fake(function() {
        emit('scanStop')
      }))

      const promise = WeatherStation.getRecord(includedReadings)
        .then(function(record) {
          record.size.should.equal(3)
          record.get('outdoor-daily-rainfall').value.should.equal(0.5)
          record.get('indoor-temperature').value.should.equal(18.7)
          record.get('indoor-humidity').value.should.equal(42)
          eventEmitter.eventNames().length.should.equal(0)
        })

      emit('stateChange', 'poweredOn')

      return promise
    })
  })
})
