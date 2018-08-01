const Tracer = require('./tracer')
const Span = require('./span')

class NoopSpan extends Span {
  _finish () {

  }
}

class NoopTracer extends Tracer {
  isSampled () {
    return false
  }

  _startSpan () {
    return new NoopSpan(this)
  }

  _inject () {

  }

  _extract () {
    return null
  }
}

module.exports = { NoopSpan, NoopTracer }
