const Koa = require('koa')
const app = new Koa()

const koaOpentracing = require('../src/index')
koaOpentracing(app, {
  appname: 'test',
  logger: [
    {log: console.log}
  ],
  httpCarrier: null,
  carrier: {
    CustomHeaderCarrier: class CustomHeaderCarrier {
      inject (spanContext) {
        return {'x-request-id': spanContext.traceId + spanContext.spanId}
      }

      extract (header) {
        const traceId = String(header['x-request-id']).substr(0, 32)
        const spanId = String(header['x-request-id']).substr(32)
        return {traceId, spanId}
      }
    }
  }
})
app.use(async ctx => {
  const spanContext = ctx.tracer.extract('CustomHeaderCarrier', ctx.header)
  const span = ctx.tracer.startSpan('t', {
    childOf: spanContext
  })
  await new Promise(resolve => setTimeout(resolve, 1000))
  span.finish()
})
app.listen('4010')
