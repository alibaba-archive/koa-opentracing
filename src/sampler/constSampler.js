class ConstSampler {
  constructor (decision) {
    this._decision = decision
  }

  isSampled () {
    return this._decision
  }
}

module.exports = ConstSampler
