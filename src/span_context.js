const generateTraceId = require('./util/traceid').generate
const generateSpanId = require('./util/spanid').generate

class SpanContext {
  constructor (parentSpanContext) {
    this._baggage = {}

    if (parentSpanContext instanceof SpanContext) {
      this.traceId = parentSpanContext.traceId
      this.spanId = generateSpanId()
      this.setBaggages(parentSpanContext.getBaggages())
    } else if (parentSpanContext) {
      this.traceId = parentSpanContext.traceId || generateTraceId()
      this.spanId = parentSpanContext.spanId || generateSpanId()
      this.setBaggages(parentSpanContext.baggages)
    } else {
      this.traceId = generateTraceId()
      this.spanId = generateSpanId()
    }
  }

  setBaggage (key, value) {
    this._baggage[key] = value
  }

  getBaggage (key) {
    return this._baggage[key]
  }

  setBaggages (baggages) {
    Object.assign(this._baggage, baggages)
  }

  getBaggages () {
    Object.assign({}, this._baggage)
  }
}

module.exports = SpanContext
