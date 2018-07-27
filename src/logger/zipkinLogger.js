const assert = require('assert')
const { HttpLogger } = require('zipkin-transport-http')
const zipkin = require('zipkin')
const crypto = require('crypto')

const map = {
  v1: {
    endpoint: '/api/v1/spans',
    jsonEncoder: zipkin.jsonEncoder.JSON_V1,
  },
  v2: {
    endpoint: '/api/v2/spans',
    jsonEncoder: zipkin.jsonEncoder.JSON_V2,
  },
}

class LogCollector {
  constructor(config) {
    const zipkinConfig = config

    let options = map[zipkinConfig.version]
    assert(options, `${zipkinConfig.version} is not supported, should be v1 or v2`)
    options = Object.assign({}, options)
    options.endpoint = zipkinConfig.endpoint + options.endpoint
    options.httpInterval = zipkinConfig.interval

    this.logger = new HttpLogger(options)
  }

  log(span) {
    this.logger.logSpan(convertToZipkinSpan(span))
  }
}

module.exports = LogCollector
const md5 = a => crypto.createHash('md5').update(a).digest('hex')
// https://github.com/openzipkin/zipkin-js/blob/master/packages/zipkin/src/model.js
function convertToZipkinSpan(span) {
  const result = {}
  result.traceId = md5(span.traceId)
  result.parentId = span.parentSpanId
  result.id = span.spanId
  result.name = span.name
  // it's microseconds
  result.timestamp = span._startTime * 1000
  // it's microseconds
  result.duration = (span._finishTime - span._startTime) * 1000
  result.tags = span.getTags()

  result.localEndpoint = {
    serviceName: span.getTag('appname'),
    ipv4: span.getTag('local.ipv4'),
    ipv6: span.getTag('local.ipv6'),
    port: span.getTag('local.port'),
  }

  let kind = span.getTag('span.kind')
  if (kind) {
    kind = kind.toUpperCase()
  }
  if ([ 'CLIENT', 'SERVER', 'PRODUCER', 'CONSUMER' ].includes(kind)) {
    result.kind = kind
    result.remoteEndpoint = {
      serviceName: span.getTag('peer.service'),
      ipv6: span.getTag('peer.ipv6'),
      ipv4: span.getTag('peer.ipv4'),
      port: span.getTag('peer.port'),
    }
  }

  result.annotations = []
  result.debug = span.getTag('debug') || false
  result.shared = span.getTag('shared') || false
  return result
}
