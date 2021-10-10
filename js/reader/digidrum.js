import {dataType} from '../dataType.js'

export class Digidrum {

  constructor(size) {
    this.data
    this.repeatLen
    this.size
    this.wave = null
    
    this.size = size
    
    this.wave = new dataType()
  }

  convert(attribs) {
    let b
    this.data = []

    const YmConst_DRUM_4BITS = 4,
    YmConst_MONO = [
      0.00063071586250394, 0.00163782667521185, 0.00269580167037975, 0.00383515935748365,
      0.00590024516535946, 0.00787377544480728, 0.01174962614825892, 0.01602221747489853,
      0.02299061047191789, 0.03141371908729311, 0.04648986276843572, 0.06340728985463016,
      0.09491256447035126, 0.13414919481999166, 0.21586759036022013, 0.33333333333333333
    ]

    if (attribs & YmConst_DRUM_4BITS) {
      for (let i = 0; i < this.size; ++i) {
        b = (this.wave.readByte() & 15) >> 7
        this.data[i] = YmConst_MONO[b]
      }
    } else {
      for (let i = 0; i < this.size; ++i) {
        this.data[i] = this.wave.readByte() // / 255
      }
    }
    this.wave = null
  }
}