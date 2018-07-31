const Koa = require('koa')
const koaOpentracing = require('../src')
const HTTPCarrier = require('../src/carrier/httpCarrier')
const ConstSampler = require('../src/sampler/constSampler')
const { expect } = require('chai')
const request = require('supertest')

describe('koaOpentracing', () => {
  it('should throw error if app param is not a koa application', () => {
    expect(() => koaOpentracing({})).to.throw()
  })
  it('should throw error if opt param without appname attribute', () => {
    expect(() => koaOpentracing(new Koa(), {})).to.throw()
  })
  describe('tracer basic usage', () => {
    const app = new Koa()
    let tracerAssigned = false
    let loggerTriggered = false
    before(done => {
      koaOpentracing(app, {
        appname: 'test',
        httpCarrier: null,
        logger: [{
          log (span) {
            loggerTriggered = true
          }
        }]
      })
      app.use(async ctx => {
        if ('tracer' in ctx) {
          tracerAssigned = true
          const span0 = ctx.tracer.startSpan('t0')
          span0.finish()
        }
      })
      request(app.listen()).get('/').end(done)
    })
    it('should add a middleware to add a tracer object to context', () => {
      expect(tracerAssigned).to.be.true
    })
    it('should trigger logger after span finished', () => {
      expect(loggerTriggered).to.be.true
    })
  })
  describe('mutli span', () => {
    const app = new Koa()
    const finishedSpan = []
    before(done => {
      koaOpentracing(app, {
        appname: 'test',
        httpCarrier: null,
        logger: [{
          log (span) {
            finishedSpan.push(span)
          }
        }]
      })
      app.use(async ctx => {
        const span0 = ctx.tracer.startSpan('t0')
        const span2 = ctx.tracer.startSpan('t2')
        const span1 = ctx.tracer.startSpan('t1')
        span0.finish()
        span2.finish()
        span1.finish()
      })
      request(app.listen()).get('/').end(done)
    })
    it('should with same trace id', () => {
      const traceId = finishedSpan.shift().context().traceId
      expect(finishedSpan.every(span => span.context().traceId)).to.be.true
    })
  })
  describe('tracer.wrap', () => {
    const app = new Koa()
    let finishedSpan
    before(done => {
      koaOpentracing(app, {
        appname: 'test',
        httpCarrier: null,
        logger: [{
          log (span) {
            finishedSpan = span
          }
        }]
      })
      app.use(async ctx => {
        ctx.tracer.wrap(function fn(param) {
          return 'return'
        }, {
          logParams: true,
          logReturn: true
        })('params')
      })
      request(app.listen()).get('/').end(done)
    })
    it('should trace correctly', () => {
      expect(finishedSpan).to.not.be.undefined
      expect(finishedSpan.name).to.eqls('fn')
      expect(finishedSpan.getTags().params).to.eqls(JSON.stringify(['params']))
      expect(finishedSpan.getTags().return).to.eqls(JSON.stringify('return'))
    })
  })
  describe('tracer.wrap', () => {
    const app = new Koa()
    let finishedSpan
    before(done => {
      koaOpentracing(app, {
        appname: 'test',
        httpCarrier: null,
        logger: [{
          log (span) {
            finishedSpan = span
          }
        }]
      })
      app.use(async ctx => {
        ctx.tracer.wrap(function fn(param) {
          throw new Error
        })('params').catch(err => {})
      })
      request(app.listen()).get('/').end(done)
    })
    it('should log error correctly', () => {
      expect(finishedSpan).to.not.be.undefined
      expect(finishedSpan.getTags().error).to.be.true
    })
  })
  describe('when opt.httpCarrier = null', () => {
    const app = new Koa()
    let finishedSpan
    before(done => {
      koaOpentracing(app, {
        appname: 'test',
        httpCarrier: null,
        logger: [{
          log (span) {
            finishedSpan = span
          }
        }]
      })
      app.use(ctx => {})
      request(app.listen()).get('/').end(done)
    })
    it('should not start span to trace whole http request', () => {
      expect(finishedSpan).to.be.undefined
    })
  })
  describe('when opt.httpCarrier not assigned', () => {
    const app = new Koa()
    let finishedSpan
    before(done => {
      koaOpentracing(app, {
        appname: 'test',
        logger: [{
          log (span) {
            finishedSpan = span
          }
        }]
      })
      app.use(async ctx => { })
      request(app.listen()).get('/').end(done)
    })
    it('should start span to trace whole http request', () => {
      expect(finishedSpan).to.not.be.undefined
    })
  })
  describe('when opt.httpCarrier is string', () => {
    const app = new Koa()
    let finishedSpan
    before(done => {
      koaOpentracing(app, {
        appname: 'test',
        httpCarrier: 'HTTP',
        logger: [{
          log (span) {
            finishedSpan = span
          }
        }],
        carrier: {
          HTTP: new HTTPCarrier()
        }
      })
      app.use(async ctx => { })
      request(app.listen()).get('/').end(done)
    })
    it('should start span to trace whole http request', () => {
      expect(finishedSpan).to.not.be.undefined
    })
  })
  describe('when opt.httpCarrier is an object', () => {
    const app = new Koa()
    let finishedSpan
    before(done => {
      koaOpentracing(app, {
        appname: 'test',
        httpCarrier: new HTTPCarrier(),
        logger: [{
          log (span) {
            finishedSpan = span
          }
        }]
      })
      app.use(async ctx => { })
      request(app.listen()).get('/').end(done)
    })
    it('should start span to trace whole http request', () => {
      expect(finishedSpan).to.not.be.undefined
    })
  })
  describe('carrier', () => {
    const app = new Koa()
    let finishedSpan
    const expectTraceId = Array(32).fill(0).map(i => (16 * Math.random() << 0).toString(16)).join('')
    const unexpectSpanId = Array(16).fill(0).map(i => (16 * Math.random() << 0).toString(16)).join('')
    const injected = {}
    before(done => {
      koaOpentracing(app, {
        appname: 'test',
        logger: [{
          log (span) {
            finishedSpan = span
          }
        }],
      })
      app.use(async ctx => {
        ctx.tracer.inject(ctx.tracer.currentSpan.context(), 'HTTP', injected)
      })
      request(app.listen()).get('/').set({
        'x-b3-traceId': expectTraceId,
        'x-b3-spanId': unexpectSpanId
      }).end(done)
    })
    it('should extract span context correctly', () => {
      expect(finishedSpan).to.not.be.undefined
      expect(finishedSpan.traceId).to.eql(expectTraceId)
      expect(finishedSpan.spanId).to.not.eql(unexpectSpanId)
      expect(injected['x-b3-traceId']).to.eql(expectTraceId)
    })
  })
  describe('ConstSampler', () => {
    const app = new Koa()
    let finishedSpan
    before(done => {
      koaOpentracing(app, {
        appname: 'test',
        logger: [{
          log (span) {
            finishedSpan = span
          }
        }],
        sampler: new ConstSampler(false)
      })
      app.use(async ctx => { })
      request(app.listen()).get('/').end(done)
    })
    it('should same as expect', () => {
      expect(finishedSpan).to.be.undefined
    })
  })
  describe('v1', () => {
    const mockKoa = {
      context: {},
      use(fn) {
        expect(fn.constructor.name).to.be.eqls('GeneratorFunction')
      }
    }
    it('should return generator function', () => {
      const v1 = koaOpentracing.v1
      expect(() => v1(mockKoa, {appname: 'test'})).to.not.throw()
      expect(v1.middleware('test').constructor.name).to.be.eqls('GeneratorFunction')
    })
  })
})
