const config = require('../src/config')
const should = require('should')

describe('config', function() {
  describe('#get()', function() {
    it('should return undefined for unknown config settings', function() {
      should(config.get('foo:bar')).equal(undefined)
    })
  })

  describe('#set()', function() {
    it('should correctly set config settings', function() {
      config.set('foo:bar', 'foo')
      config.get('foo:bar').should.equal('foo')
      config.set('foo:bar', undefined)
    })
  })
})
