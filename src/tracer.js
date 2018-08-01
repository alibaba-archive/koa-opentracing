const assert = require('assert')
const opentracing = require('opentracing')
const Span = require('./span')
const SpanContext = require('./span_context')
const { getCarrier } = require('./carriers')

class Tracer extends opentracing.Tracer {
  constructor (opt = {}) {
    super()
    this.currentSpan = null
    this.logger = opt.logger ? Array.from(opt.logger) : []
    this.opt = opt
    this.appname = opt.appname
  }

  log (span) {
    if (!(span instanceof Span)) return
    process.nextTick(() => {
      this.logger.forEach(logger => {
        logger.log(span)
      })
    })
  }

  /**
   * @return {Boolean} whether this tracer is sampled
   */
  isSampled () {
    return true
  }

  /**
   * Simplified form of inject. The spanContext is optional and if spanContext
   * is undefined will use current span or create a new SpanContext.
   *
   * @param {String} format
   * @param {SpanContext|Span} [spanContext]
   * @return {Object} be injected object
   */
  expose (format, spanContext) {
    spanContext = spanContext != null ? spanContext
      : this.currentSpan ? this.currentSpan.context() : new SpanContext()
    const carrier = {}
    this.inject(spanContext, format, carrier)
    return carrier
  }

  /**
   *
   * @param {Async function} fn
   * @param {Object} [opt]
   */
  wrap (fn, opt = {}) {
    const {thisObj, fnName, logParams, logReturn} = opt
    return async (...args) => {
      const span = this.startSpan(fnName || fn.name)
      if (logParams) span.setTag('params', JSON.stringify(args))
      try {
        const result = thisObj ? await fn.apply(thisObj, args) : await fn(...args)
        if (logReturn) span.setTag('return', JSON.stringify(result))
        return result
      } catch (error) {
        span.setTag('error', true)
        span.setTag('error.message', error.message)
        span.setTag('error.stack', error.stack)
        throw error
      } finally {
        span.finish()
      }
    }
  }

  _startSpan (name, spanOptions = {}) {
    assert(name, 'name is required when startSpan')
    spanOptions.references = spanOptions.references || []
    if (this.currentSpan) {
      const reference = opentracing.childOf(this.currentSpan)
      spanOptions.references.push(reference)
    }
    const span = new Span(this, spanOptions)
    span.setOperationName(name)
    if (!this.traceId) this.traceId = span.traceId
    if (!this.currentSpan) this.currentSpan = span
    return span
  }

  _inject (spanContext, format, carrier) {
    carrier = carrier || {}
    const carrierInstance = getCarrier(format)
    if (!carrierInstance) return
    Object.assign(carrier, carrierInstance.inject(spanContext))
  }

  _extract (format, carrier) {
    const carrierInstance = getCarrier(format)
    if (!carrierInstance) return null
    const result = carrierInstance.extract(carrier)
    if (!result.traceId) return null
    const spanContext = new SpanContext({
      traceId: result.traceId,
      spanId: result.spanId,
      baggages: result.baggage
    })
    return spanContext
  }
}

module.exports = Tracer
