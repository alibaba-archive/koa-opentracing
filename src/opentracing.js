const assert = require('assert')
const Span = require('./span')

const CARRIER = Symbol('OpenTracing#CARRIER')
const LOGGER = Symbol('OpenTracing#LOGGER')

class OpenTracing {
  constructor(app) {
    this.app = app
    this[CARRIER] = new Map()
    this[LOGGER] = []
  }

  addLogger(logger) {
    assert(logger && logger.log, 'logger should implement log')
    this[LOGGER].push(logger)
  }

  log(span) {
    if (!(span instanceof Span)) return

    process.nextTick(() => {
      for (const collector of this[LOGGER]) {
        try {
          collector.log(span)
        } catch (err) {
          console.log(err)
        }
      }
    })
  }

  setCarrier(key, Carrier) {
    assert(Carrier && Carrier.prototype.inject && Carrier.prototype.extract,
      'carrier !')
    this[CARRIER].set(key, new Carrier())
  }

  getCarrier(key) {
    return this[CARRIER].get(key)
  }

}

module.exports = OpenTracing
