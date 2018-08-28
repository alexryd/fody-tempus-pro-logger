const config = require('../src/config')
const DB = require('../src/db')
const Influx = require('influx')
const Reading = require('../src/reading')
const Record = require('../src/record')
const run = require('../src/main')
const sinon = require('sinon')
const Uploader = require('../src/uploader')
const WeatherStation = require('../src/weather-station')

describe('run()', function() {
  const dbPath = config.get('db:path')
  let db = null
  let record = null
  let getRecord = null
  let uploadRecord = null
  let uploadStoredRecords = null
  let storeRecord = null

  beforeEach(function() {
    sinon.stub(Influx, 'InfluxDB')
    config.set('db:path', ':memory:')

    db = new DB()

    record = new Record()
    record.add(new Reading('indoor', 'temperature', 21.2))
    record.add(new Reading('indoor', 'humidity', 34))
    record.add(new Reading('outdoor', 'temperature', 18.4))

    getRecord = sinon.stub(WeatherStation, 'getRecord')
    uploadRecord = sinon.stub(Uploader.prototype, 'uploadRecord')
    uploadStoredRecords = sinon.stub(Uploader.prototype, 'uploadStoredRecords')
    storeRecord = sinon.stub(db, 'storeRecord')
  })

  afterEach(function() {
    sinon.restore()
    config.set('db:path', dbPath)
  })

  it('should not upload when no record is returned', async function() {
    getRecord.resolves(new Record())
    uploadRecord.resolves()
    uploadStoredRecords.resolves()

    await run(db)

    uploadRecord.called.should.equal(false)
  })

  it('should store the record when the upload fails', async function() {
    getRecord.resolves(record)
    uploadRecord.rejects(new Error('This is a drill'))
    uploadStoredRecords.resolves()

    await run(db)

    storeRecord.calledOnce.should.equal(true)
    uploadStoredRecords.called.should.equal(false)
  })

  it('should upload stored records', async function() {
    getRecord.resolves(record)
    uploadRecord.resolves()
    uploadStoredRecords.resolves()

    await run(db)

    uploadStoredRecords.calledOnce.should.equal(true)
  })

  it('should not upload stored records when skipStored is true', async function() {
    getRecord.resolves(record)
    uploadRecord.resolves()
    uploadStoredRecords.resolves()

    await run(db, true)

    uploadStoredRecords.called.should.equal(false)
  })
})
