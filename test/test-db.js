const config = require('../src/config')
const DB = require('../src/db')
const Reading = require('../src/reading')
const Record = require('../src/record')
const should = require('should')
const sinon = require('sinon')
const sqlite3 = require('sqlite3')

describe('DB', function() {
  let db = null

  const addRecords = function() {
    return new Promise(function(resolve, reject) {
      const sql = [
        'INSERT INTO records (',
        'timestamp,',
        '"indoor-temperature",',
        '"indoor-humidity",',
        '"outdoor-temperature"',
        ') VALUES ',
        '(1534663536, 22.4, 32, 18.6),',
        '(1534663537, 19.0, 83, 5.2),',
        '(1534663538, 20.9, 12, -12.3)',
      ].join('')

      db._db.run(sql, function(error) {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  const getRecords = function() {
    return new Promise(function(resolve, reject) {
      db._db.all('SELECT * FROM records', function(error, rows) {
        if (error) {
          reject(error)
        } else {
          resolve(rows)
        }
      })
    })
  }

  beforeEach(function() {
    config.set('db:path', ':memory:')
    db = new DB()
  })

  afterEach(function() {
    config.set('db:path', config.default('db:path'))
    db = null
  })

  describe('#open()', function() {
    it('should open the database', async function() {
      await db.open()

      db._db.should.not.equal(null)
    })

    it('should call _createTables()', async function() {
      const _createTables = sinon.spy(db, '_createTables')

      await db.open()

      _createTables.called.should.equal(true)
    })
  })

  describe('#close()', function() {
    it('should clear the database connection', async function() {
      await db.open()
      await db.close()

      should(db._db).equal(null)
    })
  })

  describe('#storeRecord()', function() {
    it('should throw an error when an empty record is supplied', function() {
      (() => db.storeRecord(new Record())).should.throw(Error)
    })

    it('should insert the record into the database', async function() {
      const timestamp = new Date(2018, 7, 19, 9, 25, 36)
      const record = new Record(timestamp)
      record.add(new Reading('indoor', 'temperature', 21.4))
      record.add(new Reading('indoor', 'humidity', 48))
      record.add(new Reading('outdoor', 'temperature', 16.7))

      await db.open()
      await db.storeRecord(record)

      const records = await getRecords()
      records.length.should.equal(1)
      records[0].timestamp.should.equal(1534663536)
      records[0]['indoor-temperature'].should.equal(21.4)
      records[0]['indoor-humidity'].should.equal(48)
      records[0]['outdoor-temperature'].should.equal(16.7)
    })
  })

  describe('#retrieveRecords()', function() {
    it('should return all records when no limit is given', async function() {
      await db.open()
      await addRecords()

      const records = await db.retrieveRecords()
      records.length.should.equal(3)
    })

    it('should return some records when a limit is given', async function() {
      await db.open()
      await addRecords()

      const records = await db.retrieveRecords(2)
      records.length.should.equal(2)
    })
  })

  describe('#deleteRecords()', function() {
    it('should throw an error when no records are specified', function() {
      (() => db.deleteRecords()).should.throw(Error)
    })

    it('should delete the given records', async function() {
      await db.open()
      await addRecords()

      const records1 = await getRecords()
      await db.deleteRecords(records1)

      const records2 = await getRecords()
      records2.length.should.equal(0)

      await addRecords()

      const records3 = await getRecords()
      await db.deleteRecords(records3.slice(0, 2))

      const records4 = await getRecords()
      records4.length.should.equal(1)
    })
  })

  describe('#deleteAllRecords()', function() {
    it('should delete all records', async function() {
      await db.open()
      await addRecords()

      await db.deleteAllRecords()

      const records = await getRecords()
      records.length.should.equal(0)
    })
  })
})
