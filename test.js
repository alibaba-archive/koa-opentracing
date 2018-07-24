const Koa = require('koa')
const app = new Koa()

const koaOpentracing = require('./src/index')
const ZipkinLogger = koaOpentracing.logger.ZipkinLogger
koaOpentracing(app, {
  appname: 'test',
  http: true,
  logger: [
    new ZipkinLogger({
      endpoint: 'http://192.168.0.21:9411',
      version: 'v2',
      interval: 1000,
    }),
    {log: console.log}
  ],
  sampler: [

  ],
})
app.use(async ctx => {
  const span1 = ctx.tracer.startSpan('t')
  await new Promise(r => setTimeout(r, 1000))
  const span2 = ctx.tracer.startSpan('t')
  await new Promise(r => setTimeout(r, 2000))
  span2.finish()
  await new Promise(r => setTimeout(r, 1000))
  span1.finish()
})
app.listen('4010')