const config = require('../src/config')
const DB = require('../src/db')
const Influx = require('influx')
const Reading = require('../src/reading')
const Record = require('../src/record')
const should = require('should')
const sinon = require('sinon')
const Uploader = require('../src/uploader')

describe('uploader', function() {
  let uploader = null
  let writePoints = null

  beforeEach(function() {
    sinon.stub(Influx, 'InfluxDB')

    uploader = new Uploader()
    writePoints = uploader._influx.writePoints = sinon.stub().resolves()

    config.set('influxdb:tags', null)
  })

  afterEach(function() {
    sinon.restore()

    config.set('influxdb:tags', config.default('influxdb:tags'))
  })

  describe('#_recordToPoints()', function() {
    let now, record

    beforeEach(function() {
      now = new Date()
      record = new Record(now)
      record.add(new Reading('indoor', 'temperature', 21.2))
      record.add(new Reading('indoor', 'humidity', 34))
      record.add(new Reading('outdoor', 'temperature', 18.4))
    })

    it('should correctly convert a record to points', function() {
      const points = uploader._recordToPoints(record)

      points.should.deepEqual([
        {
          timestamp: now,
          measurement: 'temperature',
          tags: { sensor: 'indoor' },
          fields: { value: 21.2 },
        },
        {
          timestamp: now,
          measurement: 'humidity',
          tags: { sensor: 'indoor' },
          fields: { value: 34 },
        },
        {
          timestamp: now,
          measurement: 'temperature',
          tags: { sensor: 'outdoor' },
          fields: { value: 18.4 },
        },
      ])
    })

    it('should correctly add global tags to points', function() {
      config.set('influxdb:tags', { host: 'test', foo: 'bar' })

      const points = uploader._recordToPoints(record)

      points.should.deepEqual([
        {
          timestamp: now,
          measurement: 'temperature',
          tags: { sensor: 'indoor', host: 'test', foo: 'bar' },
          fields: { value: 21.2 },
        },
        {
          timestamp: now,
          measurement: 'humidity',
          tags: { sensor: 'indoor', host: 'test', foo: 'bar' },
          fields: { value: 34 },
        },
        {
          timestamp: now,
          measurement: 'temperature',
          tags: { sensor: 'outdoor', host: 'test', foo: 'bar' },
          fields: { value: 18.4 },
        },
      ])
    })

    it('should ignore null values', function() {
      const r = new Record()
      r.add(new Reading('indoor', 'temperature', null))

      const points = uploader._recordToPoints(r)

      points.length.should.equal(0)
    })
  })

  describe('#uploadRecord()', function() {
    it('should write the record to the database', async function() {
      const record = new Record()
      record.add(new Reading('indoor', 'temperature', 21.2))

      await uploader.uploadRecord(record)

      writePoints.calledOnce.should.equal(true)
    })
  })

  describe('#_storedRecordsToPoints()', function() {
    let now, row

    beforeEach(function() {
      now = new Date()
      row = {
        id: 12,
        timestamp: now.getTime() / 1000,
        'indoor-temperature': 21.2,
        'indoor-humidity': 34,
        'outdoor-temperature': 18.4,
      }
    })

    it('should correctly convert a row to points', function() {
      const points = uploader._storedRecordsToPoints([row])

      points.should.deepEqual([
        {
          timestamp: now,
          measurement: 'temperature',
          tags: { sensor: 'indoor' },
          fields: { value: 21.2 },
        },
        {
          timestamp: now,
          measurement: 'humidity',
          tags: { sensor: 'indoor' },
          fields: { value: 34 },
        },
        {
          timestamp: now,
          measurement: 'temperature',
          tags: { sensor: 'outdoor' },
          fields: { value: 18.4 },
        },
      ])
    })

    it('should correctly add global tags to points', function() {
      config.set('influxdb:tags', { host: 'test', foo: 'bar' })

      const points = uploader._storedRecordsToPoints([row])

      points.should.deepEqual([
        {
          timestamp: now,
          measurement: 'temperature',
          tags: { sensor: 'indoor', host: 'test', foo: 'bar' },
          fields: { value: 21.2 },
        },
        {
          timestamp: now,
          measurement: 'humidity',
          tags: { sensor: 'indoor', host: 'test', foo: 'bar' },
          fields: { value: 34 },
        },
        {
          timestamp: now,
          measurement: 'temperature',
          tags: { sensor: 'outdoor', host: 'test', foo: 'bar' },
          fields: { value: 18.4 },
        },
      ])
    })

    it('should ignore null values', function() {
      const r = {
        id: 12,
        timestamp: now.getTime() / 1000,
        'indoor-temperature': null,
      }

      const points = uploader._storedRecordsToPoints([r])

      points.length.should.equal(0)
    })
  })

  describe('#uploadStoredRecords()', function() {
    let db = null

    beforeEach(function() {
      config.set('db:path', ':memory:')
      db = new DB()
    })

    afterEach(function() {
      config.set('db:path', config.default('db:path'))
      db = null
    })

    it('should not write to the database when no rows are found', async function() {
      await db.open()
      await uploader.uploadStoredRecords(db)

      writePoints.called.should.equal(false)
    })

    it('should correctly write and delete stored records', async function() {
      await db.open()

      const record1 = new Record()
      record1.add(new Reading('indoor', 'temperature', 21.2))
      await db.storeRecord(record1)

      const record2 = new Record()
      record2.add(new Reading('indoor', 'humidity', 34))
      await db.storeRecord(record2)

      const record3 = new Record()
      record3.add(new Reading('outdoor', 'temperature', 18.4))
      await db.storeRecord(record3)

      const recordsBefore = await db.retrieveRecords()
      recordsBefore.length.should.equal(3)

      await uploader.uploadStoredRecords(db)

      writePoints.called.should.equal(true)
      writePoints.firstCall.args[0].length.should.equal(3)

      const recordsAfter = await db.retrieveRecords()
      recordsAfter.length.should.equal(0)
    })

    it('should correctly paginate writes', async function() {
      config.set('influxdb:maxPointsPerWrite', 2)

      await db.open()

      const record1 = new Record()
      record1.add(new Reading('indoor', 'temperature', 21.2))
      await db.storeRecord(record1)

      const record2 = new Record()
      record2.add(new Reading('indoor', 'humidity', 34))
      await db.storeRecord(record2)

      const record3 = new Record()
      record3.add(new Reading('outdoor', 'temperature', 18.4))
      await db.storeRecord(record3)

      await uploader.uploadStoredRecords(db)

      writePoints.calledTwice.should.equal(true)
      writePoints.firstCall.args[0].length.should.equal(2)
      writePoints.secondCall.args[0].length.should.equal(1)

      const recordsAfter = await db.retrieveRecords()
      recordsAfter.length.should.equal(0)

      config.set(
        'influxdb:maxPointsPerWrite',
        config.default('influxdb:maxPointsPerWrite')
      )
    })
  })
})
