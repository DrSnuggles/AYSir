/*
  by DrSnuggles (Class, DataView, moved unpack a scope above)
  Original found at: http://pure-garden-1548.herokuapp.com/
  Updated (set/getProgressgetTime, isTurbo=6ch): https://ym.mmcm.ru/fym.js?v5
*/
import * as UZIP from '../UZIP.js'  // used by FYM

export class FYMReader {

  constructor(buf) {
    buf = uzip.inflate(buf)
    this.dump = new DataView(buf.buffer)
    this.frame = 0
    this.loopCount = 0
    const lE = true // little Endian
    this.offset = this.dump.getUint32(0, lE)
    this.frameCount = this.dump.getUint32(4, lE)
    this.loopFrame = this.dump.getUint32(8, lE)
    this.clock = this.dump.getUint32(12, lE)
    this.rate = this.dump.getUint32(16, lE)
    this.title = getStr(buf, 20)
    this.author = getStr(buf, 20 + this.title.length+1)
    this.isTurbo = ((this.offset + this.frameCount*14) < buf.length)
    this.fullTime = this.frameCount / this.rate
    this.progress = 0

    function getStr(dump, ptr) { // NULL terminated
      let c, r = ''
      while (c = dump[ptr++]) r += String.fromCharCode(c)
      return r
    }
  }

  setProgress(k) {
		this.frame = Math.floor(k * this.frameCount)
	}
	
	getProgress() {
		let k = this.frame / this.frameCount
		if (k<0) k=0
		if (k>1) k=1
		return k
	}
	
	getTime() {
		let k = this.frame / this.frameCount
		if (k<0) k=0
		if (k>1) k=1
		const timeInSeconds = Math.round(k * this.fullTime)
		const minutes = Math.floor(timeInSeconds / 60)
		const seconds = "00" + (timeInSeconds - minutes * 60)
		return minutes + ":" + seconds.substr(-2,2)
	}
	
	getTimeElapsed() {
		let k = this.frame / this.frameCount
		if (k<0) k=0
		if (k>1) k=1
		const timeInSeconds = Math.round((1-k) * this.fullTime)
		const minutes = Math.floor(timeInSeconds / 60)
		const seconds = "00" + (timeInSeconds - minutes * 60)
		return "-" + minutes + ":" + seconds.substr(-2,2)
	}

  getNextFrame() {
    // update progress
    this.progress = this.getProgress()
    
    const regs = []
    for(let r = 0; r < 14; r++) {
      const pPos = r * this.frameCount + this.frame + this.offset
      if (pPos < this.dump.byteLength)
        regs[r] = this.dump.getUint8(pPos)
    }
    if (this.isTurbo) {
      const turboOffset = this.frameCount*14
      for(let r = 0; r < 14; r++) {
        let offi = r * this.frameCount + this.frame + this.offset + turboOffset
        if(offi < this.dump.byteLength)
          regs[r+14] = this.dump.getUint8(offi)
      }
    }
    if(++this.frame >= this.frameCount) {
      this.loopCount++
      this.frame = this.loopFrame
    }

    return regs
  }

}