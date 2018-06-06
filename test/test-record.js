const Reading = require('../src/reading')
const Record = require('../src/record')
const should = require('should')

describe('Record', function() {
  it('should set a default timestamp', function() {
    const record = new Record()
    record.timestamp.should.be.instanceOf(Date)
  })

  it('should not override the given timestamp', function() {
    const timestamp = new Date()
    const record = new Record(timestamp)
    record.timestamp.should.equal(timestamp)
  })

  describe('#add()', function() {
    it('should return the name of the reading', function() {
      const reading = new Reading('indoor', 'temperature', 21.2)
      const record = new Record()
      record.add(reading).should.equal(reading.name)
    })

    it('should overwrite existing readings with the same name', function() {
      const reading1 = new Reading('indoor', 'temperature', 21.1)
      const reading2 = new Reading('indoor', 'temperature', 21.2)
      const record = new Record()
      record.add(reading1)
      record.get(reading1.name).should.equal(reading1)
      record.add(reading2)
      record.get(reading1.name).should.equal(reading2)
    })
  })

  describe('#get()', function() {
    it('should return undefined for unknown readings', function() {
      const record = new Record()
      should(record.get('unknown')).equal(undefined)
    })
  })
})
