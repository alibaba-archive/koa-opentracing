const cluster = require('cluster')
const opentracing = require('opentracing')
const address = require('address')
const SpanContext = require('./span_context')

const WORKER_ID = cluster.worker ? cluster.worker.id : 0
const IPV4 = address.ip()
const IPV6 = address.ipv6()

class Span extends opentracing.Span {
  constructor (tracer, spanOptions = {}) {
    super()

    this.TRACER = tracer
    this._startTime = spanOptions.startTime || Date.now()
    this._finishTime = null
    this._tags = spanOptions.tags || {}
    this._references = spanOptions.references
    this._parentSpanContext = null

    // for test
    this.CONTEXT = spanOptions.context

    if (!this.context()) {
      if (this._references && this._references.length > 0) {
        const parentSpanContext = this._references[0].referencedContext()
        if (parentSpanContext instanceof Span) {
          this._parentSpanContext = parentSpanContext.context()
        } else {
          this._parentSpanContext = parentSpanContext
        }
      }
    }

    this.CONTEXT = new SpanContext(this._parentSpanContext)

    this.setTag('appname', tracer.appname)
    this.setTag('worker.id', WORKER_ID)
    this.setTag('process.id', process.pid)
    this.setTag('local.ipv4', IPV4)
    this.setTag('local.ipv6', IPV6)
  }

  get traceId () {
    return this.CONTEXT.traceId
  }

  get spanId () {
    return this.CONTEXT.spanId
  }

  get parentSpanId () {
    return this._parentSpanContext ? this._parentSpanContext.spanId : ''
  }

  _context () {
    return this.CONTEXT
  }

  _setOperationName (name) {
    this.name = name
  }

  _setBaggageItem (key, value) {
    this.CONTEXT.setBaggage(key, value)
  }

  _getBaggageItem (key) {
    return this.CONTEXT.getBaggage(key)
  }

  _addTags (tags) {
    Object.assign(this._tags, tags)
  }

  getTag (key) {
    return this._tags[key]
  }

  getTags () {
    return Object.assign({}, this._tags)
  }

  _finish (finishTime) {
    if (this._finishTime) return
    this._finishTime = finishTime || Date.now()
    this.TRACER.log(this)
  }
}

module.exports = Span
