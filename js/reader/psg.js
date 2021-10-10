/*
  by DrSnuggles
  based on: Gasman : https://github.com/demozoo/cowbell/blob/master/cowbell/ay_chip/psg_player.js
*/
export class PSGReader {

  constructor(buf) {
    this.frame = 0
    this.loopCount = 0
    this.clock = 1750000
    this.rate = 50 // sometimes 48.828125
    this.frames = []
    
    const signature = String.fromCharCode.apply(null, buf.subarray(0,4)) 
    if (signature !== 'PSG\x1a') {
      throw 'Not a PSG file'
    }
    let index = 0x10

		let registers = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, false]
		let frameCount

		while (index < buf.length) {
			/* scan for the next 0xf? command */
			registers[14] = false
			while (index < buf.length) {
				const command = buf[index]
				index++
				if (command == 0xfd) { // MUS_END
					index=buf.length
					break
				} else if (command == 0xff) { // INT_BEGIN
					frameCount = 1
					break
				} else if (command == 0xfe) { // INT_SKIP
					frameCount = buf[index] * 4
					index++
					break
				} else if (command < 14) {
					registers[command] = buf[index]
					index++
					if (command == 13) {
						/* mark reg13 as written */
						registers[14] = true
					}
				} else {
					throw 'Unexpected command: ' + command
				}
			}
			for (let i = 0; i < frameCount; i++) {
				this.frames.push(registers.slice())
			}
		}
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