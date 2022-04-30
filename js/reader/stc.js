/*
	by DrSnuggles
	based on infos found:
		https://documentation.help/AY-3-8910.12-ZX-Spectrum/ay_e099f.htm
*/
export class STCReader {

	constructor(buf) {
		this.dump = new DataView(buf.buffer)
		this.frame = 0
		this.loopCount = 0
		/*
		Offset  Length in bytes Name            Description
		+0      1               Delay                   Minimal number of interrupts between notes of track
		+1      2               Positions Pointer       Pointer to Positions table
		+3      2               Ornaments Pointer       Pointer to Ornaments table
		+5      2               Patterns Pointer        Pointer to Patterns table
		+7      18              Identifier              String 'SONG BY ST COMPILE'
		+25     2               Size                    Length of all module
		+27     Size-27         Data                    Other data
		*/
		const lE = false // Motorola, Big Endian
		let baseOff = 0

		this.delay = this.dump.getUint8(0, lE)
		this.ptPos = this.dump.getUint16(1, lE)
		this.ptOrn = this.dump.getUint16(3, lE)
		this.ptPat = this.dump.getUint16(5, lE)
		this.identifier = getStr(buf, 7, 18) // not a fixed identifer

		baseOff = 27 // rest is data

		function getStr(dump, ptr, len) { // fixed length
			let c, r = ''
			for (let i = 0; i < len; i++) {
				r += String.fromCharCode( dump[ptr++] )
			}
			return r
		}
	}

	getNextFrame() {
		const regs = []
		return regs
	}

}