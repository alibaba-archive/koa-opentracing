const assert = require('assert')
const { HttpLogger } = require('zipkin-transport-http')
const zipkin = require('zipkin')

const map = {
  v1: {
    endpoint: '/api/v1/spans',
    jsonEncoder: zipkin.jsonEncoder.JSON_V1
  },
  v2: {
    endpoint: '/api/v2/spans',
    jsonEncoder: zipkin.jsonEncoder.JSON_V2
  }
}

class LogCollector {
  constructor (opt) {
    const version = opt.version || 'v2'
    assert(version in map, 'version should be either v1 or v2')
    const options = Object.assign({}, map[version])
    options.endpoint = opt.endpoint + options.endpoint
    options.httpInterval = opt.interval || 1000
    this.logger = new HttpLogger(options)
  }

  log (span) {
    this.logger.logSpan(convertToZipkinSpan(span))
  }
}

module.exports = LogCollector
// https://github.com/openzipkin/zipkin-js/blob/master/packages/zipkin/src/model.js
function convertToZipkinSpan (span) {
  const result = {}
  result.traceId = span.traceId
  result.parentId = span.parentSpanId
  result.id = span.spanId
  result.name = span.name
  // it's microseconds
  result.timestamp = span._startTime * 1000
  // it's microseconds
  result.duration = (span._finishTime - span._startTime) * 1000
  const tags = span.getTags()
  result.tags = Object.keys(tags).reduce((r, k) => {
    r[k] = tags[k].toString()
    return r
  }, {})

  result.localEndpoint = {
    serviceName: span.getTag('appname'),
    ipv4: span.getTag('local.ipv4'),
    ipv6: span.getTag('local.ipv6'),
    port: span.getTag('local.port')
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
      port: span.getTag('peer.port')
    }
  }

  result.annotations = []
  result.debug = span.getTag('debug') || false
  result.shared = span.getTag('shared') || false
  return result
}
