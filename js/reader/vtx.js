/*
  based on: Gasman : https://github.com/demozoo/cowbell/blob/master/cowbell/ay_chip/buf_player.js
  an LH5-compressed stream of AY chip events
*/
import * as LHA from '../LH4.js'

export class VTXReader {

  constructor(buf) {
    this.frame = 0
    this.loopCount = 0
    this.frames = []
    
    const signature = String.fromCharCode.apply(null, buf.subarray(0,2))
    if (signature !== 'ay' && signature !== 'ym') {
      throw 'Not a VTX file'
    }
    this.mode = signature.toUpperCase()
    
		const STEREO_MODES = {1: 'abc', 2: 'acb', 3: 'bac', 4: 'bca', 5: 'cab', 6: 'cba'}
    const stereoModeId = buf[2] & 0x07
    this.stereoMode = STEREO_MODES[stereoModeId] || 'mono'

    this.clock = (buf[8] << 24) | (buf[7] << 16) | (buf[6] << 8) | buf[5]
    this.rate = buf[9]

    this.createdYear = (buf[11] << 8) | buf[10]
    let unpackedSize = (buf[15] << 24) | (buf[14] << 16) | (buf[13] << 8) | buf[12] // will overwrite later

    let currentOffset = 16

    const titleOffset = 16
    while (buf[currentOffset] !== 0) currentOffset++
    this.title = String.fromCharCode.apply(null, buf.subarray(titleOffset, currentOffset))
    currentOffset++

    const authorOffset = currentOffset
    while (buf[currentOffset] !== 0) currentOffset++
    this.author = String.fromCharCode.apply(null, buf.subarray(authorOffset, currentOffset))
    currentOffset++

    const sourceProgramOffset = currentOffset
    while (buf[currentOffset] !== 0) currentOffset++
    this.sourceProgram = String.fromCharCode.apply(null, buf.subarray(sourceProgramOffset, currentOffset))
    currentOffset++

    const editorProgramOffset = currentOffset
    while (buf[currentOffset] !== 0) currentOffset++
    this.editorProgram = String.fromCharCode.apply(null, buf.subarray(editorProgramOffset, currentOffset))
    currentOffset++

    const commentOffset = currentOffset
    while (buf[currentOffset] !== 0) currentOffset++
    this.comment = String.fromCharCode.apply(null, buf.subarray(commentOffset, currentOffset))
    currentOffset++

    //console.time('unpackedData')
    // todo: this is damn slow. needs >7 secs to unpack 2,2kB
    const reader = new LHA.LhaReader(new LHA.LhaArrayReader(buf),'lh5')
    let that = this
    //console.timeEnd('unpackedData')
    const unpackedData = reader.extract(currentOffset, unpackedSize, function(done,total) {
      if (done < total) return
      //unpackedSize = unpackedData.length
      
  		const streamLength = unpackedSize / 14
  		let lastEnvelopeVal = 0

  		for (let i = 0; i < streamLength; i++) {
  			const registers = []
  			for (let chan = 0; chan < 14; chan++) {
  				const val = unpackedData[chan * streamLength + i]
  				if (chan < 13) {
  					registers[chan] = val
  				} else {
  					if (val == 0xff) {
  						registers[13] = lastEnvelopeVal
  						registers[14] = false
  					} else {
  						registers[13] = val
  						lastEnvelopeVal = val
  						registers[14] = true
  					}
  				}
  			}

  			that.frames[i] = registers
  		}
      

    })

  }

  getNextFrame() {
    const ret = this.frames[this.frame]
    if(++this.frame >= this.frames.length) {
      this.loopCount++
      this.frame = 0//this.loopFrame
    }
    return ret
  }

}