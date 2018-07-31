const assert = require('assert')
const Tracer = require('./tracer')
const {NoopTracer} = require('./noop')
const { getCarrier, setCarrier } = require('./carriers')

/**
 *
 * @param {Application} app
 * @param {Object} opt
 * @param {String} opt.appname
 * @param {Logger[]} opt.logger
 * @param {Carrier|String} [opt.httpCarrier]
 * @param {Object} [opt.httpTag]
 * @param {Boolean} [opt.httpTag.header]
 * @param {Object} [opt.carrier]
 * @param {Sampler} [opt.sampler]
 */
const koaOpentracing = (app, opt, version) => {
  assert(app && app.context, 'only could be used on koa application')
  assert(opt && opt.appname, 'opt.appname must be assigned')
  if (opt.carrier) Object.entries(opt.carrier).map(([k, v]) => setCarrier(k, v))

  let httpCarrier
  if (opt.httpCarrier === null) {
    httpCarrier = null
  } else if (typeof opt.httpCarrier === 'string') {
    httpCarrier = opt.httpCarrier
  } else if (typeof opt.httpCarrier === 'object') {
    httpCarrier = 'HTTP'
    setCarrier(httpCarrier, opt.httpCarrier)
  } else {
    httpCarrier = 'HTTP'
    const HTTPCarrier = require('./carrier/httpCarrier')
    if (!getCarrier('HTTP')) setCarrier('HTTP', new HTTPCarrier())
  }

  app.use(createTracer(opt, version))
  if (httpCarrier) {
    app.use(traceHttp(opt, httpCarrier, version))
  }
}

const createTracer = (opt, version) => {
  const _createTracer = (ctx, opt) => {
    if (opt.sampler && !opt.sampler.isSampled(ctx)) ctx.tracer = new NoopTracer()
    ctx.tracer = ctx.tracer || new Tracer(opt)
  }
  if (version === 'v1') {
    return function * createTracer (next) {
      _createTracer(this, opt)
      yield next
    }
  }
  return async (ctx, next) => {
    _createTracer(ctx, opt)
    await next()
  }
}

const traceHttp = (opt, httpCarrier, version) => {
  const createHttpTracer = (ctx, httpCarrier) => {
    const spanContext = ctx.tracer.extract(httpCarrier, ctx.header)
    const span = ctx.tracer.startSpan('http', {
      childOf: spanContext
    })
    span.setTag('span.kind', 'server')
    return span
  }
  const finishHttpTracer = (span, ctx, opt) => {
    const socket = ctx.socket
    span.setTag('peer.port', socket.remotePort)
    if (socket.remoteFamily === 'IPv4') {
      span.setTag('peer.ipv4', socket.remoteAddress)
    } else if (socket.remoteFamily === 'IPv6') {
      span.setTag('peer.ipv6', socket.remoteAddress)
    }
    if (opt.httpTag && opt.httpTag.header) { span.setTag('http.header', JSON.stringify(ctx.header)) }
    span.setTag('appname', opt.appname)
    span.setTag('http.url', ctx.path)
    span.setTag('http.method', ctx.method)
    span.setTag('http.status_code', ctx.realStatus)
    span.setTag('http.request_size', ctx.get('content-length') || 0)
    span.setTag('http.response_size', ctx.length || 0)
    span.finish()
  }
  if (version === 'v1') {
    return function * traceHttp (next) {
      const span = createHttpTracer(this, httpCarrier)
      yield next
      finishHttpTracer(span, this, opt)
    }
  }
  return async (ctx, next) => {
    const span = createHttpTracer(ctx, httpCarrier)
    await next()
    finishHttpTracer(span, ctx, opt)
  }
}

/**
 * @param {string} name span name
 */
const middleware = (name, version) => {
  if (version === 'v1') {
    return function * middleware (next) {
      assert(this.tracer, 'use koaOpentracing before middleware')
      const span = this.tracer.startSpan(name)
      yield next
      span.finish()
    }
  }
  return async (ctx, next) => {
    assert(ctx.tracer, 'use koaOpentracing before middleware')
    const span = ctx.tracer.startSpan(name)
    await next()
    span.finish()
  }
}

const v2 = (app, opt) => {
  koaOpentracing(app, opt, 'v2')
}
v2.middleware = (name, version) => middleware(name, version, 'v2')

const v1 = (app, opt) => {
  koaOpentracing(app, opt, 'v1')
}
v1.middleware = (name, version) => middleware(name, version, 'v1')
module.exports = v2
module.exports.v2 = v2
module.exports.v1 = v1
