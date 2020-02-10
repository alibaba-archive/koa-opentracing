koa-opentracing
======

[![Build Status](https://travis-ci.org/teambition/koa-opentracing.svg?branch=master)](https://travis-ci.org/teambition/koa-opentracing)
[![Coverage Status](https://coveralls.io/repos/github/teambition/koa-opentracing/badge.svg?branch=master)](https://coveralls.io/github/teambition/koa-opentracing?branch=master)
![](https://img.shields.io/npm/v/koa-opentracing.svg)
![](https://img.shields.io/node/v/koa-opentracing.svg)
![](https://img.shields.io/npm/l/koa-opentracing.svg)

A koa opentracing plugin and fully compatible with opentracing.

### Usage

```js
require('@babel/polyfill') // if necessary
const Koa = require('koa')
const app = new Koa()

const koaOpentracing = require('koa-opentracing')
koaOpentracing(app, {
  appname: 'test',
  logger: [
    {
      log: console.log
    }
  ]
})
app.use(async ctx => {
  const span = ctx.tracer.startSpan('span')
  await new Promise(r => setTimeout(r, 1000)) // Some time-consuming work
  span.finish()
})
app.listen('4010')
```

### Compatible with koa@1.*

```js
const koaOpentracing = require('koa-opentracing').v1
```

### API

```ts

/**
 * main function to add a middleware to assign a tracer on context
 * @param {Application} app koa application
 * @param {Object} opt options
 * @param {String} opt.appname service name
 * @param {Logger[]} opt.logger an array of logger instance
 * @param {Carrier|String} [opt.httpCarrier] an carrier be used for extract span from http header
 * @param {Object} [opt.httpTag] options of data need to trace of the whole http request
 * @param {Boolean} [opt.httpTag.header] if true will trace the header of the request
 * @param {Object} [opt.carrier] an map of carriers instance
 * @param {Sampler} [opt.sampler] an sampler instance
 */
function koaOpentracing(app: Application, opt: Object) {}

/**
 * create an koa middleware and auto start a span
 *
 * * Compatible with koa@1.*
 *
 * @param {String} name span name
 * @return {Function} middleware
 */
koaOpentracing.middleware(name: String): Function {}

/**
 * all log method of loggers will be triggered after span finished
 */
interface Logger {
  log(span: Span): void
}

interface Carrier {
  inject(spanContext): spanContextCarrier
  extract(header): spanContextCarrier
}

interface spanContextCarrier {
  traceId: String
  spanId: String
  baggage?: Object
}

interface Sampler {
  isSampled(ctx: Context): Boolean
}

/**
 * Will be instantiated at the beginning of each request and assigned to ctx.tracer
 */
class Tracer {
    /**
     * Starts and returns a new Span representing a logical unit of work.
     *
     * @param {string} name - the name of the operation (REQUIRED).
     * @param {SpanOptions} [options] - options for the newly created span.
     * @return {Span} - a new Span object.
     */
    startSpan(name: string, options?: SpanOptions): Span;
    /**
     * Injects the given SpanContext instance for cross-process propagation
     *
     * @param  {SpanContext} spanContext - the SpanContext to inject into the
     *         carrier object. As a convenience, a Span instance may be passed
     *         in instead (in which case its .context() is used for the
     *         inject()).
     * @param  {string} format - the format of the carrier.
     * @param  {any} carrier - see the documentation for the chosen `format`
     *         for a description of the carrier object.
     */
    inject(spanContext: SpanContext | Span, format: string, carrier: any): void;
    /**
     * Returns a SpanContext instance extracted from `carrier` in the given
     *
     * @param  {string} format - the format of the carrier.
     * @param  {any} carrier - the type of the carrier object is determined by
     *         the format.
     * @return {SpanContext}
     *         The extracted SpanContext, or null if no such SpanContext could
     *         be found in `carrier`
     */
    extract(format: string, carrier: any): SpanContext | null;

    /**
     *
     * A utility method to simplify the use of tracer.
     *
     * It will wrap a method, start a span before method called and finish the
     * span after method execution completed. The method name will be used by
     * default for the name of the span.
     *
     * @param {Function} fn Time-consuming method to track
     * @param {Object} opt
     * @param {any} [opt.thisObj]
     * @param {string} [opt.fnName] function name will be used as span name
     * @param {Boolean} [opt.logParams] if true will trace the params
     * @param {Boolean} [opt.logReturn] if true will trace the return
     * @return {Function} wrapped method
     */
    wrap(fn: Function, opt: Object): Function;

    /**
     * Simplified form of inject. The spanContext is optional and if spanContext
     * is undefined will use current span or create a new SpanContext.
     *
     * @param {String} format
     * @param {SpanContext|Span} [spanContext]
     * @return {Object} be injected object
     */
    expose(format: Span, spanContext?: SpanContext | Span): Object;

    /**
     * @return {Boolean} whether this tracer is sampled
     */
    isSampled(): Boolean;
}
```

### Built in

Need to import manually like following ways.

```js
const HTTPCarrier = require('koa-opentracing/src/carrier/httpCarrier')
```

#### src/carrier/httpCarrier

Cross-process tracking via http header

#### src/logger/zipkinLogger

Built-in logger for zipkin

```ts
class ZipkinLogger {
  constructor(opt: {
    version?: 'v1' | 'v2' = 'v1'
    endpoint: string
    interval: number = 1000
  })
}
```

#### src/sampler/constSampler

A simple constant sampler

```ts
class ConstSampler {
  constructor(decision: boolean)
}
```

### License

MIT LICENSE
