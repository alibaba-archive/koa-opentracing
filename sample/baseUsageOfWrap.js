const Koa = require('koa')
const app = new Koa()

const koaOpentracing = require('../src/index')
koaOpentracing(app, {
  appname: 'test',
  logger: [
    {log: console.log}
  ],
})
app.use(async ctx => {
  await ctx.tracer.wrap(async function ttttt (a) {
    await new Promise(r => setTimeout(r, 1000))
    if (Math.random() > 0.5)
      throw new Error('err')
    return '11111111'
  })('aaaaa')
})
app.listen('4010')
