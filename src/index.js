const Tracer = require('./tracer')
const OpenTracing = require('./opentracing')
const ZipkinLogger = require('./logger/zipkinLogger')
const HTTPCarrier = require('./carrier/httpCarrier')
const wrapper = (app, opt) => {
  const opentracing = app.opentracing = new OpenTracing(app)
  if (opt.carrier) {
    for (const key of Object.keys(opt.carrier)) {
      const carrier = config.carrier[key];
      if (carrier === false) continue;
      opentracing.setCarrier(key, carrier);
    }
  }
  if (opt.logger) {
    for (const logger of opt.logger) {
      opentracing.addLogger(logger)
    }
  }
  app.use(createTracer(opt))
  if (opt.http) {
    opentracing.setCarrier('HTTP', HTTPCarrier)
    app.use(traceHttp(opt))
  }
}
const createTracer = opt => {
  return async (ctx, next) => {
    ctx.tracer = ctx.tracer || new Tracer(ctx, opt)
    await next()
  }
}
const traceHttp = opt => {
  return async (ctx, next) => {
    const spanContext = ctx.tracer.extract('HTTP', ctx.header)
    const span = ctx.tracer.startSpan('http_server', {
      childOf: spanContext
    })
    span.setTag('span.kind', 'server')
    await next()
    const socket = ctx.socket
    span.setTag('peer.port', socket.remotePort);
    if (socket.remoteFamily === 'IPv4') {
      span.setTag('peer.ipv4', socket.remoteAddress);
    } else if (socket.remoteFamily === 'IPv6') {
      span.setTag('peer.ipv6', socket.remoteAddress);
    }
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
  if (app && app.context) wrapper(app, opt)
}
module.exports.logger = {
  ZipkinLogger,
}
module.exports.carrier = {
  HTTPCarrier,
}
