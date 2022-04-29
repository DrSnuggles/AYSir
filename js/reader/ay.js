/*
	by DrSnuggles
	based on infos found:
		https://documentation.help/AY-3-8910.12-ZX-Spectrum/ay_e04vt.htm
*/
export class AYReader {

	constructor(buf) {
		this.dump = new DataView(buf.buffer)
		this.frame = 0
		this.loopCount = 0
		/*
		Offset  Length in bytes Name            Description
		+0      4               FileID          File identifier ‘ZXAY’
		+4      4               TypeID          File type. Emulator supports ‘EMUL’ type, which requires Z80 emulation, and ‘AMAD’ type, which is analog of FXM file.
		+8      1               FileVersion     File version, you can use this field as free as you want, however, format author recommends to numerate versions in turn (first version (release) is 0, second is 1 and so on).
		+9      1               PlayerVersion   Required player version for playing. Only three versions are exists now.
																						0       Use zero if you do not know what player version you need.
																						1       Initial player version.
																						2       First 256 byte of Z80 memory is fill with 0xC9 value (RET instruction).
																						3       Last version for now. Full Z80 emulation plus beeper port emulation. See its full description at the end of this description.
		+10     2               PSpecialPlayer  This is for AY-files which contain player in MC68000 machine codes. As Patrik Rak is saying, only one file of this kind is exists, so, can be simply ignored.
		+12     2               PAuthor         Pointer to null-terminated string with author name, only one for whole AY-file.
		+14     2               PMisc           Same, but to string with miscellaneous information.
		+16     1               NumOfSongs      Number of tunes in file decreased by 1.
		+17     1               FirstSong       Tune number, which must be played first, decreased by 1 too.
		+18     2               PSongsStructure Relative pointer to “Song structure” record.
		*/
		const lE = false // Motorola, Big Endian
		let baseOff = 0

		this.fileID = getStr(buf, 0, 4)
		this.typeID = getStr(buf, 4, 4) // actually i will start with EMUL only
		this.fileVersion = this.dump.getUint8(8, lE)
		this.playerVersion = this.dump.getUint8(9, lE)
		this.ptPlayer = this.dump.getUint16(10, lE)
		this.ptAuthor = this.dump.getUint16(12, lE)
		this.ptMisc = this.dump.getUint16(14, lE)
		this.numSongs = this.dump.getUint8(16, lE)
		this.firstSong = this.dump.getUint8(17, lE)
		this.ptSongsStructure = this.dump.getUint16(18, lE)

		this.author = getStr(buf, 12+1+this.ptAuthor, 11) // +1 // its fixed to 11 ?? thats one loader!
		this.comment = getStr(buf, 14+1+this.ptMisc, 11) // misc

		/*
		+0      2               PSongName       Relative offset to null-terminated string with name of corresponding tune.
		+2      2               PSongData       Offset to record “Song data”
		*/
		baseOff = 18+this.ptSongsStructure
		this.ptSongName = this.dump.getUint16(baseOff+0, lE)
		this.ptSongData = this.dump.getUint16(baseOff+2, lE)
		
		this.title = getStr(buf, baseOff+this.ptSongName+1, 11)
		
		/*
		Record “Song data” for 'EMUL' type has next structure.
		+0      1               AChan           Amiga’s channel number for emulating A AY channel.
		+1      1               BChan           Amiga’s channel number for emulating B AY channel.
		+2      1               CChan           Amiga’s channel number for emulating C AY channel.
		+3      1               Noise           Amiga’s channel number for emulating AY noise.
																						Typically these four bytes are 0, 1, 2, 3. You also can use these four numbers in any order.
		+4      2               SongLength      Song duration in 1/50 of second. If zero, than length is unknown (infinitely).
		+6      2               FadeLength      Duration of fade after end of song in 1/50 of second.
		+8      1               HiReg           Values of high halves of all Z80 common registers (AF, AF’, HL, HL', DE, DE', BC, BC', IX and IY).
		+9      1               LoReg           Values of low halves of all Z80 common registers including flag registers.
		+10     2               PPoints         Pointer to “Pointers” record.
		+12     2               PAddresses      Pointer to “Data blocks” record.
		*/
		if (this.typeID === 'EMUL') {
			baseOff = 18+this.ptSongsStructure+4

			this.aChan = this.dump.getUint8(baseOff+0, lE)
			this.bChan = this.dump.getUint8(baseOff+1, lE)
			this.cChan = this.dump.getUint8(baseOff+2, lE)
			this.noise = this.dump.getUint8(baseOff+3, lE)
			this.songLength = this.dump.getUint16(baseOff+4, lE)
			this.fadeLength = this.dump.getUint16(baseOff+6, lE)
			this.hiReg = this.dump.getUint8(baseOff+8, lE)
			this.loReg = this.dump.getUint8(baseOff+9, lE)
			this.ptPtrs = this.dump.getUint16(baseOff+10, lE)
			this.ptAdr = this.dump.getUint16(baseOff+12, lE)

			/* There are stack, initialization and playing routines addresses for the tune.
			+0      2               Stack           Value of SP register before starting emulation.
			+2      2               INIT            Initialization subprogram address in Z80 memory.
			+4      2               INTERRUPT       Playing subprogram address (calls 50 times per second).
			*/
			baseOff = 18+this.ptSongsStructure+4+10+this.ptPtrs

			this.stack = this.dump.getUint16(baseOff+0, lE)
			this.init = this.dump.getUint16(baseOff+2, lE)
			this.int = this.dump.getUint16(baseOff+4, lE)
			
			/*
			Record “Data blocks” is simple too. It is sequences of groups by three word values. End of sequence is first zero address (i.e. Address = 0).
			+0      2               Address1        First block address in Z80 memory.
			+2      2               Length1         Length of first block in bytes.
			+6  +4  2               Offset1         Relative offset to begin of 1st block in the AY-file.
			+8  +6  2               Address2        Second block address in Z80 memory.
			+10 +8  2               Length2         Length of 2nd block in bytes.
			+12 +10 2               Offset2         Relative offset to begin of 2nd block in the AY-file.
			and so on while Address = 0 will be met.
			*/
			baseOff = 18+this.ptSongsStructure+4+10+this.ptPtrs+6
			this.dataBlocks = []
			while (this.dump.getUint16(baseOff+0, lE) != 0) {
				this.dataBlocks.push({
					adr: this.dump.getUint16(baseOff+0, lE),
					len: this.dump.getUint16(baseOff+2, lE),
					off: this.dump.getUint16(baseOff+4, lE),
					abs: this.dump.getUint16(baseOff+4, lE) + baseOff+4,
					data: getStr(buf, this.dump.getUint16(baseOff+4, lE) + baseOff+4, this.dump.getUint16(baseOff+2, lE)).split('\u0000'),
				})
				baseOff += 6
			}

		} else if(this.typeID === 'AMAD') {
			/*
			+0      2               AllocAddress    Allocation address of data block in Spectrum memory.
			+2      1               Andsix          The parameter must either 31 or 15. It is used for correction result of addition current noise value and parameter of 8D command (see FXM description). I.e. some players use 5 bits of noise register, and some only 4 ones.
			+3      1               Loops           Number of loops.
			+4      2               LoopLen         Length of one loop in interrupts (VBI).
			+6      2               FadeOffset      Precise fade specification (unused in Ay_Emul)
			+8      2               FadeLen         How long to fade (unused in Ay_Emul)
			+10     1               AChan           Amiga’s channel number for emulating A AY channel.
			+11     1               BChan           Amiga’s channel number for emulating B AY channel.
			+12     1               CChan           Amiga’s channel number for emulating C AY channel.
			+13     1               Noise           Amiga’s channel number for emulating AY noise.
																							Typically these four bytes are 0, 1, 2, 3. You also can use these four numbers in any order.
			+14     ???             ZXData          Original data block from ZX Spectrum program. See full description in FXM module description of this help system.
			As you can see, both EMUL and AMAD subtypes can contain more than one tune in one AY-file.
			*/
			baseOff = 18+this.ptSongsStructure+4
			this.amad = {
				alloc: this.dump.getUint16(baseOff+0, lE),
				andsix: this.dump.getUint8(baseOff+2, lE),
				loops: this.dump.getUint8(baseOff+3, lE),
				loopLen: this.dump.getUint16(baseOff+4, lE),
				fadeOff: this.dump.getUint16(baseOff+6, lE),
				fadeLen: this.dump.getUint16(baseOff+8, lE),
				chanA: this.dump.getUint8(baseOff+10, lE),
				chanB: this.dump.getUint8(baseOff+11, lE),
				chanC: this.dump.getUint8(baseOff+12, lE),
				noise: this.dump.getUint8(baseOff+13, lE),
				data: getStrNULL(buf, baseOff+14),
			}
		}
		function getStrNULL(dump, ptr) { // NULL terminated
			let c, r = ''
			while (c = dump[ptr++]) r += String.fromCharCode(c)
			return r
		}
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
		for(let r = 0; r < 14; r++) {
			regs[r] = this.dump.getUint8(r * this.frameCount + this.frame + this.offset)
		}
		if(++this.frame >= this.frameCount) {
			this.loopCount++
			this.frame = this.loopFrame
		}
		return regs
	}

}