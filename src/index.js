const Tracer = require('./tracer')
const OpenTracing = require('./opentracing')
const ZipkinLogger = require('./logger/zipkinLogger')
const HTTPCarrier = require('./carrier/httpCarrier')
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
 */
const koaOpentracing = (app, opt) => {
  const opentracing = app.opentracing = new OpenTracing(app)
  if (opt.carrier) {
    for (const key of Object.keys(opt.carrier)) {
      const carrier = opt.carrier[key]
      if (!carrier) continue
      opentracing.setCarrier(key, carrier)
    }
  }

  let httpCarrier
  if (opt.httpCarrier === null) {
    httpCarrier = null
  } else if (opt.httpCarrier === undefined) {
    httpCarrier = 'HTTP'
    if (!opentracing.getCarrier('HTTP'))
      opentracing.setCarrier('HTTP', HTTPCarrier)
  } else if (typeof opt.httpCarrier === 'string') {
    httpCarrier = opt.httpCarrier
  } else if (typeof opt.httpCarrier === 'object') {
    httpCarrier = Symbol('OpenTracing#HttpCarrier')
    opentracing.setCarrier(httpCarrier, opt.httpCarrier)
  }

  if (opt.logger) {
    for (const logger of opt.logger) {
      opentracing.addLogger(logger)
    }
  }
  app.use(createTracer(opt))
  if (opt.httpCarrier) {
    app.use(traceHttp(opt, httpCarrier))
  }
}
const createTracer = opt => {
  return async (ctx, next) => {
    ctx.tracer = ctx.tracer || new Tracer(ctx, opt)
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
    if (opt.httpTag && opt.httpTag.header)
      span.setTag('http.header', JSON.stringify(ctx.header))
    span.setTag('appname', opt.appname)
    span.setTag('http.url', ctx.path)
    span.setTag('http.method', ctx.method)
    span.setTag('http.status_code', ctx.realStatus)
    span.setTag('http.request_size', ctx.get('content-length') || 0)
    span.setTag('http.response_size', ctx.length || 0)
    span.finish()
  }
}
module.exports = (app, opt) => {
  if (app && app.context) koaOpentracing(app, opt)
}
module.exports.logger = {
  ZipkinLogger,
}
module.exports.carrier = {
  HTTPCarrier,
}
