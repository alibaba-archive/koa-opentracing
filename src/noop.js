const Tracer = require('./tracer')
const Span = require('./span')
const SpanContext = require('./span_context')

class NoopSpan extends Span {
  _finish() {

  }
}

class NoopTracer extends Tracer {
  constructor() {
    super()
  }

  _startSpan() {
    return new NoopSpan(this)
  }

  _inject() {

  }

  _extract() {
    return null
  }
}

module.exports = { NoopSpan, NoopTracer }
