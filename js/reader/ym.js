//import {dataType} from './dataType.class.js'
import {dataType} from '../dataType.js' // used by YMReader, LHA(replaced), digidrums // Todo: replace with native DataView?
import * as LHA from '../LH4.js'
import {Digidrum} from './digidrum.js'

export class YMReader {
  
  constructor(buf) {
    this.title
    this.author
    this.comment
    
    this.attribs
    this.clock
    this.digidrums
    this.drums
    this.frames = []
    this.frameSize // 14 and 16 are common not sure if double was also possible here
    this.length
    this.rate
    this.restart
    this.supported = true
    this.frame = 0
    this.loopCount = 0

    const reader = new LHA.LhaReader(new LHA.LhaArrayReader(buf),'lh5')
    const firstEntry = Object.keys(reader.entries)[0]
    let that = this
    const unpackedData = reader.extract(reader.entries[firstEntry].offset, reader.entries[firstEntry].originalSize, function(done,total) {
      if (done < total) return
      
      const ff = []
      for (let z = 0, l = unpackedData.length; z < l; z++) {
        ff[z] = String.fromCharCode(unpackedData[z])
      }
      
      that.data = new dataType(ff.join(''))

      that.init()
    })
    
  }

  init() {
    this.decode()
    if (this.attribs & 1/*YmConst_INTERLEAVED*/) this.deinterleave()

    for (let i = 0; i < this.length; ++i) {
      this.frames[i] = this.data.readBytes(0, this.frameSize)
    }

  }

  decode() {
    var digidrum
    var i
    var id = this.data.readMultiByte(4, 'txt')

    switch (id) {
      case 'YM2!':
      case 'YM3!':
      case 'YM3b':
        this.frameSize = 14
        this.length = (this.data.data.length - 4) / this.frameSize
        this.clock = 2000000 //YmConst_ATARI_FREQ
        this.rate = 50
        this.restart = (id != 'YM3b') ? 0 : this.data.readByte()
        this.attribs = 1 | 8 //YmConst_INTERLEAVED | YmConst_TIME_CONTROL
        break

      case 'YM4!':
        this.supported = false
        break

      case 'YM5!':
      case 'YM6!':
        id = this.data.readMultiByte(8, 'txt')
        if (id != 'LeOnArD!') {
          this.supported = false
          return
        }

        this.length = this.data.readInt()
        this.attribs = this.data.readInt()
        this.drums = this.data.readShort()
        this.clock = this.data.readInt()
        this.rate = this.data.readShort()
        this.restart = this.data.readInt()
        this.data.readShort()

        if (this.drums) {
          this.digidrums = []

          for (let i = 0; i < this.drums; ++i) {
            this.digidrum = new Digidrum(this.data.readInt())

            if (this.digidrum.size != 0) {
              this.digidrum.wave.data = this.data.readBytes(0, this.digidrum.size)
              this.digidrum.convert(this.attribs)
              this.digidrums[i] = this.digidrum
            }
          }
          this.attribs &= (~4/*YmConst_DRUM_4BITS*/)
        }

        this.title = this.data.readString()
        this.author = this.data.readString()
        this.comment = this.data.readString()

        this.frameSize = 16
        this.attribs = 1 | 8 //YmConst_INTERLEAVED | YmConst_TIME_CONTROL
        break

      case 'MIX1':
        this.supported = false
        break

      case 'YMT1':
      case 'YMT2':
        this.supported = false
        break

      default:
        this.supported = false
        break
    }
    this.type = id // DrSnuggles
  }

  deinterleave() {
    var i
    var j
    var s = 0

    var p = []
    var r = []

    for (let i = 0; i < this.frameSize; ++i) p[i] = this.data.pos + (this.length * i)

    for (let i = 0; i < this.length; ++i) {
      for (let j = 0; j < this.frameSize; ++j) r[j + s] = this.data.data[i + p[j]]
      s += this.frameSize
    }

    this.data.data = ''
    this.data.data = r
    this.data.pos = 0
    this.attribs &= (~1) //(~YmConst_INTERLEAVED)
  }
  
  getNextFrame() {
    const regs = []
    for (let r = 0; r < this.frameSize; r++) {
      regs[r] = this.frames[this.frame].charCodeAt(r)//this.frames[this.frame][r].charCodeAt(0) = this.frames[this.frame].charCodeAt(r)
    }
    
    if(++this.frame >= this.frames.length) {
      this.loopCount++
      this.frame = this.loopFrame ? this.loopFrame : 0 // ToDo: does it exists in this format?
    }
    return regs
  }

}