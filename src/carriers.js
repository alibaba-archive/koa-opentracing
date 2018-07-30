
const _carrier = {}

const setCarrier = (key, carrier) => {
  _carrier[key] = carrier
}

const getCarrier = key => {
  return _carrier[key]
}

module.exports = { setCarrier, getCarrier }
