const assert = require('assert')
const opentracing = require('opentracing')
const Span = require('./span')
const SpanContext = require('./span_context')

class Tracer extends opentracing.Tracer {

  constructor(ctx, opt) {
    super()
    this.ctx = ctx
    this.currentSpan = null
    this.opt = opt
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

  _startSpan(name, options) {
    assert(name, 'name is required when startSpan')

    const spanOptions = Object.assign({}, this.opt)
    if (options.references && options.references.length) {
      spanOptions.parentSpan = options.references[0].referencedContext()
    } else if (this.currentSpan) {
      spanOptions.parentSpan = this.currentSpan
    }

    const span = new Span(this.ctx, spanOptions)
    span.setOperationName(name)
    if (!this.traceId) this.traceId = span.traceId
    if (!this.currentSpan) this.currentSpan = span
    return span
  }

  _inject(spanContext, format, carrier) {
    carrier = carrier || {}
    const carrierInstance = this.ctx.app.opentracing.getCarrier(format)
    assert(carrierInstance, `${format} is unknown carrier`)
    Object.assign(carrier, carrierInstance.inject(spanContext))
  }

  _extract(format, carrier) {
    const carrierInstance = this.ctx.app.opentracing.getCarrier(format)
    assert(carrierInstance, `${format} is unknown carrier`)
    const result = carrierInstance.extract(carrier)
    if (!(result.traceId && result.spanId)) return null

    const spanContext = new SpanContext({
      traceId: result.traceId,
      spanId: result.spanId,
      rpcId: result.rpcId,
      baggages: result.baggage,
    })
    return spanContext
  }

}

module.exports = Tracer
