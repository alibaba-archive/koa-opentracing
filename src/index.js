const assert = require('assert')
const Tracer = require('./tracer')
const {NoopTracer} = require('./noop')
const ZipkinLogger = require('./logger/zipkinLogger')
const HTTPCarrier = require('./carrier/httpCarrier')
const ConstSampler = require('./sampler/constSampler')
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
const koaOpentracing = module.exports = (app, opt) => {
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
    if (!getCarrier('HTTP')) setCarrier('HTTP', new HTTPCarrier())
  }

  app.use(createTracer(opt))
  if (httpCarrier) {
    app.use(traceHttp(opt, httpCarrier))
  }
}
const createTracer = opt => {
  return async (ctx, next) => {
    if (opt.sampler && !opt.sampler.isSampled(ctx)) ctx.tracer = new NoopTracer()
    ctx.tracer = ctx.tracer || new Tracer(opt)
    await next()
  }
}
const traceHttp = (opt, httpCarrier) => {
  return async (ctx, next) => {
    const spanContext = ctx.tracer.extract(httpCarrier, ctx.header)
    const span = ctx.tracer.startSpan('http', {
      childOf: spanContext
    })
    span.setTag('span.kind', 'server')
    await next()
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
}
koaOpentracing.logger = {
  ZipkinLogger
}
koaOpentracing.carrier = {
  HTTPCarrier
}
koaOpentracing.sampler = {
  ConstSampler
}
