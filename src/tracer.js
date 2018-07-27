const assert = require('assert')
const opentracing = require('opentracing')
const Span = require('./span')
const SpanContext = require('./span_context')
const koaOpentracing = require('./index')

class Tracer extends opentracing.Tracer {

  constructor(opt = {}) {
    super()
    this.currentSpan = null
    this.logger = opt.logger ? Array.from(opt.logger) : []
    this.opt = opt
    this.appname = opt.appname
  }

  log(span) {
    if (!(span instanceof Span)) return
    process.nextTick(() => {
      this.logger.forEach(logger => {
        logger.log(span)
      })
    })
  }

  /**
   *
   * @param {Async function} fn
   * @param {Object} [opt]
   */
  wrap(fn, opt = {}) {
    const {thisObj, fnName, logThis, logParams, logReturn} = opt
    return async (...args) => {
      const span = this.startSpan(fnName || fn.name)
      // if (logThis) span.setTag('this', JSON.stringify(thisObj || this.ctx))
      // if (logParams) span.setTag('params', JSON.stringify(args))
      try {
        const result = thisObj ? await fn.apply(thisObj, args) : await fn(...args)
        // if (logReturn) span.setTag('return', JSON.stringify(result))
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

  _startSpan(name, spanOptions = {}) {
    assert(name, 'name is required when startSpan')

    if (!spanOptions.childOf && (!spanOptions.references || spanOptions.length === 0))
      spanOptions.childOf = this.currentSpan

    const span = new Span(this, spanOptions)
    span.setOperationName(name)
    if (!this.traceId) this.traceId = span.traceId
    if (!this.currentSpan) this.currentSpan = span
    return span
  }

  _inject(spanContext, format, carrier) {
    carrier = carrier || {}
    const carrierInstance = koaOpentracing.getCarrier(format)
    if (!carrierInstance) return
    Object.assign(carrier, carrierInstance.inject(spanContext))
  }

  _extract(format, carrier) {
    const carrierInstance = koaOpentracing.getCarrier(format)
    if (!carrierInstance) return null
    const result = carrierInstance.extract(carrier)
    if (!(result.traceId && result.spanId)) return null

    const spanContext = new SpanContext({
      traceId: result.traceId,
      spanId: result.spanId,
      baggages: result.baggage,
    })
    return spanContext
  }

}

module.exports = Tracer
