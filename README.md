koa-opentracing
======

A koa opentracing plugin and fully compatible with opentracing.

### Usage

```js
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
export declare class Tracer {
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
    wrap(fn: Function, opt: Object): Function,
}
```

### Built in

#### koaOpentracing.carrier.HTTPCarrier

Cross-process tracking via http header

#### koaOpentracing.logger.ZipkinLogger

Built-in logger for zipkin

```ts
class ZipkinLogger {
  constructor(opt: {
    version: 'v1' | 'v2',
    endpoint: string
    interval: number
  })
}
```

#### koaOpentracing.sampler.ConstSampler

A simple constant sampler

```ts
class ConstSampler {
  constructor(decision: boolean)
}
```

### License

MIT LICENSE
