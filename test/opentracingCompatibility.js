const apiCompatibilityChecks = require('opentracing/lib/test/api_compatibility.js').default
const noopImplementationTests = require('opentracing/lib/test/noop_implementation.js').default
const Tracer = require('../src/tracer.js')

describe('tracer', () => {
  it('is compatible with opentracing', () => {
    apiCompatibilityChecks(() => new Tracer(), {
      checkBaggageValues: true
    })
    noopImplementationTests(() => new Tracer())
  })
})
