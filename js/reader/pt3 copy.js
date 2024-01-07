/*
	by DrSnuggles
	based on: ESPboy ... based on libayfly ... based on S.V. Bulba
	and looking into Vortex Tracker II by S.V. Bulba
*/

import {getStr, findBytes} from './getStr.js'

export class PT3Reader {

	// version specific settings
	VER = {
		//{Volume table of Pro Tracker 3.3x - 3.4x}
		PT3VolumeTable_33_34: [[0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
		[0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01],
		[0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x01, 0x01, 0x01, 0x02, 0x02, 0x02, 0x02, 0x02],
		[0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x01, 0x01, 0x02, 0x02, 0x02, 0x02, 0x03, 0x03, 0x03, 0x03],
		[0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x01, 0x02, 0x02, 0x02, 0x03, 0x03, 0x03, 0x04, 0x04, 0x04],
		[0x00, 0x00, 0x00, 0x01, 0x01, 0x01, 0x02, 0x02, 0x03, 0x03, 0x03, 0x04, 0x04, 0x04, 0x05, 0x05],
		[0x00, 0x00, 0x00, 0x01, 0x01, 0x02, 0x02, 0x03, 0x03, 0x03, 0x04, 0x04, 0x05, 0x05, 0x06, 0x06],
		[0x00, 0x00, 0x01, 0x01, 0x02, 0x02, 0x03, 0x03, 0x04, 0x04, 0x05, 0x05, 0x06, 0x06, 0x07, 0x07],
		[0x00, 0x00, 0x01, 0x01, 0x02, 0x02, 0x03, 0x03, 0x04, 0x05, 0x05, 0x06, 0x06, 0x07, 0x07, 0x08],
		[0x00, 0x00, 0x01, 0x01, 0x02, 0x03, 0x03, 0x04, 0x05, 0x05, 0x06, 0x06, 0x07, 0x08, 0x08, 0x09],
		[0x00, 0x00, 0x01, 0x02, 0x02, 0x03, 0x04, 0x04, 0x05, 0x06, 0x06, 0x07, 0x08, 0x08, 0x09, 0x0A],
		[0x00, 0x00, 0x01, 0x02, 0x03, 0x03, 0x04, 0x05, 0x06, 0x06, 0x07, 0x08, 0x09, 0x09, 0x0A, 0x0B],
		[0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x04, 0x05, 0x06, 0x07, 0x08, 0x08, 0x09, 0x0A, 0x0B, 0x0C],
		[0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D],
		[0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E],
		[0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F]],

		//{Volume table of Pro Tracker 3.5x}
		PT3VolumeTable_35: [[0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
		[0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01],
		[0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x02, 0x02, 0x02, 0x02],
		[0x00, 0x00, 0x00, 0x01, 0x01, 0x01, 0x01, 0x01, 0x02, 0x02, 0x02, 0x02, 0x02, 0x03, 0x03, 0x03],
		[0x00, 0x00, 0x01, 0x01, 0x01, 0x01, 0x02, 0x02, 0x02, 0x02, 0x03, 0x03, 0x03, 0x03, 0x04, 0x04],
		[0x00, 0x00, 0x01, 0x01, 0x01, 0x02, 0x02, 0x02, 0x03, 0x03, 0x03, 0x04, 0x04, 0x04, 0x05, 0x05],
		[0x00, 0x00, 0x01, 0x01, 0x02, 0x02, 0x02, 0x03, 0x03, 0x04, 0x04, 0x04, 0x05, 0x05, 0x06, 0x06],
		[0x00, 0x00, 0x01, 0x01, 0x02, 0x02, 0x03, 0x03, 0x04, 0x04, 0x05, 0x05, 0x06, 0x06, 0x07, 0x07],
		[0x00, 0x01, 0x01, 0x02, 0x02, 0x03, 0x03, 0x04, 0x04, 0x05, 0x05, 0x06, 0x06, 0x07, 0x07, 0x08],
		[0x00, 0x01, 0x01, 0x02, 0x02, 0x03, 0x04, 0x04, 0x05, 0x05, 0x06, 0x07, 0x07, 0x08, 0x08, 0x09],
		[0x00, 0x01, 0x01, 0x02, 0x03, 0x03, 0x04, 0x05, 0x05, 0x06, 0x07, 0x07, 0x08, 0x09, 0x09, 0x0A],
		[0x00, 0x01, 0x01, 0x02, 0x03, 0x04, 0x04, 0x05, 0x06, 0x07, 0x07, 0x08, 0x09, 0x0A, 0x0A, 0x0B],
		[0x00, 0x01, 0x02, 0x02, 0x03, 0x04, 0x05, 0x06, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0A, 0x0B, 0x0C],
		[0x00, 0x01, 0x02, 0x03, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0A, 0x0B, 0x0C, 0x0D],
		[0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E],
		[0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F]],

	}

	/*
	// TS sigs
	TSsigs = [
    	[0x50, 0x72, 0x6f, 0x54, 0x72, 0x61, 0x63, 0x6b, 0x65, 0x72, 0x20, 0x33, 0x2e],
		[0x56, 0x6f, 0x72, 0x74, 0x65, 0x78, 0x20, 0x54, 0x72, 0x61, 0x63, 0x6b, 0x65, 0x72, 0x20, 0x49, 0x49],
	]
	*/

	constructor(buf) {
		this.buf = buf
		this.dump = new DataView(buf.buffer)
		this.bin = getStr(buf, 0, buf.length)
		this.frame = 0
		this.frameCount = 9999
		this.loopCount = 0
		this.progress = 0
		this.clock = 1773400 // 2000000 ST, 1773400 ZX, 1750000 Pent, 1500000 Vecx, 1000000 CPC, 3500000 Turbo?
		this.rate = 50 // 200 ST, 100 twiceInt, 60 ST, 50 ZX, 48.828 Pent
		this.regs = [{
			AY_CHNL_A_FINE: 0,
			AY_CHNL_A_COARSE: 0,
			AY_CHNL_B_FINE: 0,
			AY_CHNL_B_COARSE: 0,
			AY_CHNL_C_FINE: 0,
			AY_CHNL_C_COARSE: 0,
			AY_NOISE_PERIOD: 0,
			AY_MIXER: 0,
			AY_CHNL_A_VOL: 0,
			AY_CHNL_B_VOL: 0,
			AY_CHNL_C_VOL: 0,
			AY_ENV_FINE: 0,
			AY_ENV_COARSE: 0,
			AY_ENV_SHAPE: 0,
			AY_GPIO_A: 0,
			AY_GPIO_B: 0
		},{
			AY_CHNL_A_FINE: 0,
			AY_CHNL_A_COARSE: 0,
			AY_CHNL_B_FINE: 0,
			AY_CHNL_B_COARSE: 0,
			AY_CHNL_C_FINE: 0,
			AY_CHNL_C_COARSE: 0,
			AY_NOISE_PERIOD: 0,
			AY_MIXER: 0,
			AY_CHNL_A_VOL: 0,
			AY_CHNL_B_VOL: 0,
			AY_CHNL_C_VOL: 0,
			AY_ENV_FINE: 0,
			AY_ENV_COARSE: 0,
			AY_ENV_SHAPE: 0,
			AY_GPIO_A: 0,
			AY_GPIO_B: 0
		}]

		this.version = ((this.bin[13] >= '0') && (this.bin[13] <= '9')) ? this.bin[13]*1 : 6 // defaults to PT3.6
		// ^^ needs rework also title+author
		this.tracker = this.bin.substring(0,0x1C).trim()//getStr(buf, 0, 0x19).trim()
		this.title = this.bin.substring(0x1E,0x3F).trim()//getStr(buf, 0x20, 0x19).trim()
		this.author = this.bin.substring(0x42,0x62).trim()
		if (this.bin.indexOf('Vortex Tracker II 1.') !== -1) {
			this.tracker = this.bin.substring(0,0x15).trim()
		} else if (this.bin.indexOf('ProTracker 3.') !== -1) {
			this.tracker = this.bin.substring(0,0xF).trim()
		}
		//const sigPos = [...findBytes(buf, this.TSsigs[0]), ...findBytes(buf, this.TSsigs[1])]
		let sigPos = this.bin.substring(0x63).indexOf('ProTracker 3.') + 1 + this.bin.substring(0x63).indexOf('Vortex Tracker II') + 1
		this.isTurbo = sigPos
		this.module1 = sigPos

		// modules
		this.mods = [{
			buf: [...buf], // todo: split at second module
			PT3_MusicName: getStr(buf, 0, 0x63),
			PT3_TonTableId: buf[0x63], 			// 02
			PT3_Delay: buf[0x64], 				// 04
			PT3_NumberOfPositions: buf[0x65],	// 2B
			PT3_LoopPosition: buf[0x66],		// 2A
			PT3_PatternsPointer: this.dump.getUint16(0x67, true), // 005F littleEndian
			PT3_SamplesPointers: Array.from({length: 32}, (_,i) => this.dump.getUint16(0x69+i*2, true) ),
			PT3_OrnamentsPointers: Array.from({length: 16}, (_,i) => this.dump.getUint16(0x69+64+i*2, true) ),
			PT3_PositionList: Array.from({length: 128}, (_,i) => this.dump.getUint16(0x69+64+32+i*2, true) ),
			PT3: {
				Env_Base_lo: 0,
				Env_Base_hi: 0,
			},
			PT3_A: {},
			PT3_B: {},
			PT3_C: {},
		}]
		// copy proper note tables
		this.mods[0].notes = this.getNoteTable(this.mods[0].PT3.Version, this.mods[0].PT3.PT3_TonTableId)
		// not yet set in mods[1]

		this.readModule(0)
		if (this.isTurbo) this.readModule(1)
	}

	readModule(modNum) {
		const mod = this.mods[modNum]
		let i = mod.PT3_PositionList[0]
		const b = mod.PT3_MusicName.charCodeAt(0x62)
		if(b != 0x20) { // todo: which format check is this? " "
			i = b * 3 - 3 - i
		}
		const PT3 = mod.PT3
		const PT3_A = mod.PT3_A
		const PT3_B = mod.PT3_B
		const PT3_C = mod.PT3_C
		PT3.Version = this.version
		PT3.DelayCounter = 1
		PT3.Delay = mod.PT3_Delay // todo: check if source is used or not somewhere else
		PT3.CurrentPosition = 0
		PT3_A.Address_In_Pattern = mod.PT3_PatternsPointer + i * 2//this.getWord(mod.PT3_PatternsPointer + i * 2)
		PT3_B.Address_In_Pattern = mod.PT3_PatternsPointer + i * 2 + 2//this.getWord(mod.PT3_PatternsPointer + i * 2 + 2)
		PT3_C.Address_In_Pattern = mod.PT3_PatternsPointer + i * 2 + 4//this.getWord(mod.PT3_PatternsPointer + i * 2 + 4)

		PT3_A.OrnamentPointer = mod.PT3_OrnamentsPointers[0]
		PT3_A.Loop_Ornament_Position = mod.buf[PT3_A.OrnamentPointer++]
		PT3_A.Ornament_Length = mod.buf[PT3_A.OrnamentPointer++]
		PT3_A.SamplePointer = mod.PT3_SamplesPointers[1]
		PT3_A.Loop_Sample_Position = mod.buf[PT3_A.SamplePointer++]
		PT3_A.Sample_Length = mod.buf[PT3_A.SamplePointer++]
		PT3_A.Volume = 15
		PT3_A.Note_Skip_Counter = 1
		PT3_A.Number_Of_Notes_To_Skip = 1

		PT3_B.OrnamentPointer = PT3_A.OrnamentPointer
		PT3_B.Loop_Ornament_Position = PT3_A.Loop_Ornament_Position
		PT3_B.Ornament_Length = PT3_A.Ornament_Length
		PT3_B.SamplePointer = PT3_A.SamplePointer
		PT3_B.Loop_Sample_Position = PT3_A.Loop_Sample_Position
		PT3_B.Sample_Length = PT3_A.Sample_Length
		PT3_B.Volume = 15
		PT3_B.Note_Skip_Counter = 1
		PT3_B.Number_Of_Notes_To_Skip = 1

		PT3_C.OrnamentPointer = PT3_A.OrnamentPointer
		PT3_C.Loop_Ornament_Position = PT3_A.Loop_Ornament_Position
		PT3_C.Ornament_Length = PT3_A.Ornament_Length
		PT3_C.SamplePointer = PT3_A.SamplePointer
		PT3_C.Loop_Sample_Position = PT3_A.Loop_Sample_Position
		PT3_C.Sample_Length = PT3_A.Sample_Length
		PT3_C.Volume = 15
		PT3_C.Note_Skip_Counter = 1
		PT3_C.Number_Of_Notes_To_Skip = 1

	}

	getNoteTable(ver, tblID) {
		//Table #0 of Pro Tracker 3.3x - 3.4r
		const PT3NoteTable_PT_33_34r = [0x0C21, 0x0B73, 0x0ACE, 0x0A33, 0x09A0, 0x0916, 0x0893, 0x0818, 0x07A4, 0x0736, 0x06CE, 0x066D, 0x0610, 0x05B9, 0x0567, 0x0519, 0x04D0, 0x048B, 0x0449, 0x040C, 0x03D2, 0x039B, 0x0367, 0x0336, 0x0308, 0x02DC, 0x02B3, 0x028C, 0x0268, 0x0245, 0x0224, 0x0206, 0x01E9, 0x01CD, 0x01B3, 0x019B, 0x0184, 0x016E, 0x0159, 0x0146, 0x0134, 0x0122, 0x0112, 0x0103, 0x00F4, 0x00E6, 0x00D9, 0x00CD, 0x00C2, 0x00B7, 0x00AC, 0x00A3, 0x009A, 0x0091, 0x0089, 0x0081, 0x007A, 0x0073, 0x006C, 0x0066, 0x0061, 0x005B, 0x0056, 0x0051, 0x004D, 0x0048, 0x0044, 0x0040, 0x003D, 0x0039, 0x0036, 0x0033, 0x0030, 0x002D, 0x002B, 0x0028, 0x0026, 0x0024, 0x0022, 0x0020, 0x001E, 0x001C, 0x001B, 0x0019, 0x0018, 0x0016, 0x0015, 0x0014, 0x0013, 0x0012, 0x0011, 0x0010, 0x000F, 0x000E, 0x000D, 0x000C]

		//{Table #0 of Pro Tracker 3.4x - 3.5x}
		const PT3NoteTable_PT_34_35 = [0x0C22, 0x0B73, 0x0ACF, 0x0A33, 0x09A1, 0x0917, 0x0894, 0x0819, 0x07A4, 0x0737, 0x06CF, 0x066D, 0x0611, 0x05BA, 0x0567, 0x051A, 0x04D0, 0x048B, 0x044A, 0x040C, 0x03D2, 0x039B, 0x0367, 0x0337, 0x0308, 0x02DD, 0x02B4, 0x028D, 0x0268, 0x0246, 0x0225, 0x0206, 0x01E9, 0x01CE, 0x01B4, 0x019B, 0x0184, 0x016E, 0x015A, 0x0146, 0x0134, 0x0123, 0x0112, 0x0103, 0x00F5, 0x00E7, 0x00DA, 0x00CE, 0x00C2, 0x00B7, 0x00AD, 0x00A3, 0x009A, 0x0091, 0x0089, 0x0082, 0x007A, 0x0073, 0x006D, 0x0067, 0x0061, 0x005C, 0x0056, 0x0052, 0x004D, 0x0049, 0x0045, 0x0041, 0x003D, 0x003A, 0x0036, 0x0033, 0x0031, 0x002E, 0x002B, 0x0029, 0x0027, 0x0024, 0x0022, 0x0020, 0x001F, 0x001D, 0x001B, 0x001A, 0x0018, 0x0017, 0x0016, 0x0014, 0x0013, 0x0012, 0x0011, 0x0010, 0x000F, 0x000E, 0x000D, 0x000C]

		//{Table #1 of Pro Tracker 3.3x - 3.5x)}
		const PT3NoteTable_ST = [0x0EF8, 0x0E10, 0x0D60, 0x0C80, 0x0BD8, 0x0B28, 0x0A88, 0x09F0, 0x0960, 0x08E0, 0x0858, 0x07E0, 0x077C, 0x0708, 0x06B0, 0x0640, 0x05EC, 0x0594, 0x0544, 0x04F8, 0x04B0, 0x0470, 0x042C, 0x03FD, 0x03BE, 0x0384, 0x0358, 0x0320, 0x02F6, 0x02CA, 0x02A2, 0x027C, 0x0258, 0x0238, 0x0216, 0x01F8, 0x01DF, 0x01C2, 0x01AC, 0x0190, 0x017B, 0x0165, 0x0151, 0x013E, 0x012C, 0x011C, 0x010A, 0x00FC, 0x00EF, 0x00E1, 0x00D6, 0x00C8, 0x00BD, 0x00B2, 0x00A8, 0x009F, 0x0096, 0x008E, 0x0085, 0x007E, 0x0077, 0x0070, 0x006B, 0x0064, 0x005E, 0x0059, 0x0054, 0x004F, 0x004B, 0x0047, 0x0042, 0x003F, 0x003B, 0x0038, 0x0035, 0x0032, 0x002F, 0x002C, 0x002A, 0x0027, 0x0025, 0x0023, 0x0021, 0x001F, 0x001D, 0x001C, 0x001A, 0x0019, 0x0017, 0x0016, 0x0015, 0x0013, 0x0012, 0x0011, 0x0010, 0x000F]

		//{Table #2 of Pro Tracker 3.4r}
		const PT3NoteTable_ASM_34r = [0x0D3E, 0x0C80, 0x0BCC, 0x0B22, 0x0A82, 0x09EC, 0x095C, 0x08D6, 0x0858, 0x07E0, 0x076E, 0x0704, 0x069F, 0x0640, 0x05E6, 0x0591, 0x0541, 0x04F6, 0x04AE, 0x046B, 0x042C, 0x03F0, 0x03B7, 0x0382, 0x034F, 0x0320, 0x02F3, 0x02C8, 0x02A1, 0x027B, 0x0257, 0x0236, 0x0216, 0x01F8, 0x01DC, 0x01C1, 0x01A8, 0x0190, 0x0179, 0x0164, 0x0150, 0x013D, 0x012C, 0x011B, 0x010B, 0x00FC, 0x00EE, 0x00E0, 0x00D4, 0x00C8, 0x00BD, 0x00B2, 0x00A8, 0x009F, 0x0096, 0x008D, 0x0085, 0x007E, 0x0077, 0x0070, 0x006A, 0x0064, 0x005E, 0x0059, 0x0054, 0x0050, 0x004B, 0x0047, 0x0043, 0x003F, 0x003C, 0x0038, 0x0035, 0x0032, 0x002F, 0x002D, 0x002A, 0x0028, 0x0026, 0x0024, 0x0022, 0x0020, 0x001E, 0x001D, 0x001B, 0x001A, 0x0019, 0x0018, 0x0015, 0x0014, 0x0013, 0x0012, 0x0011, 0x0010, 0x000F, 0x000E]

		//{Table #2 of Pro Tracker 3.4x - 3.5x}
		const PT3NoteTable_ASM_34_35 = [0x0D10, 0x0C55, 0x0BA4, 0x0AFC, 0x0A5F, 0x09CA, 0x093D, 0x08B8, 0x083B, 0x07C5, 0x0755, 0x06EC, 0x0688, 0x062A, 0x05D2, 0x057E, 0x052F, 0x04E5, 0x049E, 0x045C, 0x041D, 0x03E2, 0x03AB, 0x0376, 0x0344, 0x0315, 0x02E9, 0x02BF, 0x0298, 0x0272, 0x024F, 0x022E, 0x020F, 0x01F1, 0x01D5, 0x01BB, 0x01A2, 0x018B, 0x0174, 0x0160, 0x014C, 0x0139, 0x0128, 0x0117, 0x0107, 0x00F9, 0x00EB, 0x00DD, 0x00D1, 0x00C5, 0x00BA, 0x00B0, 0x00A6, 0x009D, 0x0094, 0x008C, 0x0084, 0x007C, 0x0075, 0x006F, 0x0069, 0x0063, 0x005D, 0x0058, 0x0053, 0x004E, 0x004A, 0x0046, 0x0042, 0x003E, 0x003B, 0x0037, 0x0034, 0x0031, 0x002F, 0x002C, 0x0029, 0x0027, 0x0025, 0x0023, 0x0021, 0x001F, 0x001D, 0x001C, 0x001A, 0x0019, 0x0017, 0x0016, 0x0015, 0x0014, 0x0012, 0x0011, 0x0010, 0x000F, 0x000E, 0x000D]

		//{Table #3 of Pro Tracker 3.4r}
		const PT3NoteTable_REAL_34r = [0x0CDA, 0x0C22, 0x0B73, 0x0ACF, 0x0A33, 0x09A1, 0x0917, 0x0894, 0x0819, 0x07A4, 0x0737, 0x06CF, 0x066D, 0x0611, 0x05BA, 0x0567, 0x051A, 0x04D0, 0x048B, 0x044A, 0x040C, 0x03D2, 0x039B, 0x0367, 0x0337, 0x0308, 0x02DD, 0x02B4, 0x028D, 0x0268, 0x0246, 0x0225, 0x0206, 0x01E9, 0x01CE, 0x01B4, 0x019B, 0x0184, 0x016E, 0x015A, 0x0146, 0x0134, 0x0123, 0x0113, 0x0103, 0x00F5, 0x00E7, 0x00DA, 0x00CE, 0x00C2, 0x00B7, 0x00AD, 0x00A3, 0x009A, 0x0091, 0x0089, 0x0082, 0x007A, 0x0073, 0x006D, 0x0067, 0x0061, 0x005C, 0x0056, 0x0052, 0x004D, 0x0049, 0x0045, 0x0041, 0x003D, 0x003A, 0x0036, 0x0033, 0x0031, 0x002E, 0x002B, 0x0029, 0x0027, 0x0024, 0x0022, 0x0020, 0x001F, 0x001D, 0x001B, 0x001A, 0x0018, 0x0017, 0x0016, 0x0014, 0x0013, 0x0012, 0x0011, 0x0010, 0x000F, 0x000E, 0x000D]

		//{Table #3 of Pro Tracker 3.4x - 3.5x}
		const PT3NoteTable_REAL_34_35 = [0x0CDA, 0x0C22, 0x0B73, 0x0ACF, 0x0A33, 0x09A1, 0x0917, 0x0894, 0x0819, 0x07A4, 0x0737, 0x06CF, 0x066D, 0x0611, 0x05BA, 0x0567, 0x051A, 0x04D0, 0x048B, 0x044A, 0x040C, 0x03D2, 0x039B, 0x0367, 0x0337, 0x0308, 0x02DD, 0x02B4, 0x028D, 0x0268, 0x0246, 0x0225, 0x0206, 0x01E9, 0x01CE, 0x01B4, 0x019B, 0x0184, 0x016E, 0x015A, 0x0146, 0x0134, 0x0123, 0x0112, 0x0103, 0x00F5, 0x00E7, 0x00DA, 0x00CE, 0x00C2, 0x00B7, 0x00AD, 0x00A3, 0x009A, 0x0091, 0x0089, 0x0082, 0x007A, 0x0073, 0x006D, 0x0067, 0x0061, 0x005C, 0x0056, 0x0052, 0x004D, 0x0049, 0x0045, 0x0041, 0x003D, 0x003A, 0x0036, 0x0033, 0x0031, 0x002E, 0x002B, 0x0029, 0x0027, 0x0024, 0x0022, 0x0020, 0x001F, 0x001D, 0x001B, 0x001A, 0x0018, 0x0017, 0x0016, 0x0014, 0x0013, 0x0012, 0x0011, 0x0010, 0x000F, 0x000E, 0x000D]

		switch(tblID) {
			case 0:
				if(ver <= 3)
					return PT3NoteTable_PT_33_34r
				else
					return PT3NoteTable_PT_34_35
			case 1:
				return PT3NoteTable_ST
			case 2:
				if(ver <= 3)
					return PT3NoteTable_ASM_34r
				else
					return PT3NoteTable_ASM_34_35
			default:
				if(ver <= 3)
					return PT3NoteTable_REAL_34r
				else
					return PT3NoteTable_REAL_34_35
		}
	}
	/*
	PT3_GetNoteFreq(j, mod) {
		// todo: get rid of this and copy proper table on init/change once ;)
		const ver = this.mods[mod].PT3.Version
		switch(this.mods[mod].PT3_TonTableId) {
			case 0:
				if(ver <= 3)
					return PT3NoteTable_PT_33_34r[j]
				else
					return PT3NoteTable_PT_34_35[j]
			case 1:
				return PT3NoteTable_ST[j]
			case 2:
				if(ver <= 3)
					return PT3NoteTable_ASM_34r[j]
				else
					return PT3NoteTable_ASM_34_35[j]
			default:
				if(ver <= 3)
					return PT3NoteTable_REAL_34r[j]
				else
					return PT3NoteTable_REAL_34_35[j]
		}
	}
	*/

	getWord(offset, modNum) {
		//console.log('getWord', offset, modNum)
		return this.mods[modNum].buf[offset] + this.mods[modNum].buf[offset+1]*256
	}

	PT3_PatternInterpreter(chan, modNum) {
		console.log('PT3_PatternInterpreter', chan, modNum)
		const mod = this.mods[modNum]
		let quit = false,
		flag9 = 0, flag8 = 0, flag5 = 0, flag4 = 0, flag3 = 0, flag2 = 0, flag1 = 0,
		counter = 0,
		prnote = chan.Note,
		prsliding = chan.Current_Ton_Sliding

		do {
			let val = mod.buf[chan.Address_In_Pattern]
			if(val >= 0xf0) {
				chan.OrnamentPointer = mod.PT3_OrnamentsPointers[val - 0xf0]
				chan.Loop_Ornament_Position = mod.buf[chan.OrnamentPointer++]
				chan.Ornament_Length = mod.buf[chan.OrnamentPointer++]
				chan.Address_In_Pattern++
				chan.SamplePointer = mod.PT3_SamplesPointers[mod.buf[chan.Address_In_Pattern] / 2]
				chan.Loop_Sample_Position = mod.buf[chan.SamplePointer++]
				chan.Sample_Length = mod.buf[chan.SamplePointer++]
				chan.Envelope_Enabled = false
				chan.Position_In_Ornament = 0
			} else if(val >= 0xd1 && val <= 0xef) {
				chan.SamplePointer = mod.PT3_SamplesPointers[val - 0xd0]
				chan.Loop_Sample_Position = mod.buf[chan.SamplePointer++]
				chan.Sample_Length = mod.buf[chan.SamplePointer++]
			} else if(val == 0xd0) {
				quit = true
			} else if(val >= 0xc1 && val <= 0xcf) {
				chan.Volume = val - 0xc0
			} else if(val == 0xc0) {
				chan.Position_In_Sample = 0
				chan.Current_Amplitude_Sliding = 0
				chan.Current_Noise_Sliding = 0
				chan.Current_Envelope_Sliding = 0
				chan.Position_In_Ornament = 0
				chan.Ton_Slide_Count = 0
				chan.Current_Ton_Sliding = 0
				chan.Ton_Accumulator = 0
				chan.Current_OnOff = 0
				chan.Enabled = false
				quit = true
			} else if(val >= 0xb2 && val <= 0xbf) {
				chan.Envelope_Enabled = true
				this.regs[modNum].AY_ENV_SHAPE = val - 0xb1
				mod.PT3.Env_Base_hi = mod.buf[++chan.Address_In_Pattern]
				mod.PT3.Env_Base_lo = mod.buf[++chan.Address_In_Pattern]
				chan.Position_In_Ornament = 0
				mod.PT3.Cur_Env_Slide = 0
				mod.PT3.Cur_Env_Delay = 0
			} else if(val == 0xb1) {
				chan.Number_Of_Notes_To_Skip = mod.buf[++chan.Address_In_Pattern]
			} else if(val == 0xb0) {
				chan.Envelope_Enabled = false
				chan.Position_In_Ornament = 0
			} else if(val >= 0x50 && val <= 0xaf) {
				chan.Note = val - 0x50
				chan.Position_In_Sample = 0
				chan.Current_Amplitude_Sliding = 0
				chan.Current_Noise_Sliding = 0
				chan.Current_Envelope_Sliding = 0
				chan.Position_In_Ornament = 0
				chan.Ton_Slide_Count = 0
				chan.Current_Ton_Sliding = 0
				chan.Ton_Accumulator = 0
				chan.Current_OnOff = 0
				chan.Enabled = true
				quit = true
			} else if(val >= 0x40 && val <= 0x4f) {
				chan.OrnamentPointer = mod.PT3_OrnamentsPointers[val - 0x40]
				chan.Loop_Ornament_Position = mod.buf[chan.OrnamentPointer++]
				chan.Ornament_Length = mod.buf[chan.OrnamentPointer++]
				chan.Position_In_Ornament = 0
			} else if(val >= 0x20 && val <= 0x3f) {
				mod.PT3.Noise_Base = val - 0x20
			} else if(val >= 0x10 && val <= 0x1f) {
				if(val == 0x10)
					chan.Envelope_Enabled = false
				else {
					this.regs[modNum].AY_ENV_SHAPE = val - 0x10
					mod.PT3.Env_Base_hi = mod.buf[++chan.Address_In_Pattern]
					mod.PT3.Env_Base_lo = mod.buf[++chan.Address_In_Pattern]
					chan.Envelope_Enabled = true
					mod.PT3.Cur_Env_Slide = 0
					mod.PT3.Cur_Env_Delay = 0
				}
				chan.SamplePointer = mod.PT3_SamplesPointers[mod.buf[++chan.Address_In_Pattern] / 2]
				chan.Loop_Sample_Position = mod.buf[chan.SamplePointer++]
				chan.Sample_Length = mod.buf[chan.SamplePointer++]
				chan.Position_In_Ornament = 0
			} else if(val == 0x9) {
				counter++
				flag9 = counter
			} else if(val == 0x8) {
				counter++
				flag8 = counter
			} else if(val == 0x5) {
				counter++
				flag5 = counter
			} else if(val == 0x4) {
				counter++
				flag4 = counter
			} else if(val == 0x3) {
				counter++
				flag3 = counter
			} else if(val == 0x2) {
				counter++
				flag2 = counter
			} else if(val == 0x1) {
				counter++
				flag1 = counter
			}
			chan.Address_In_Pattern++
		} while(!quit)

		while(counter > 0) {
			if(counter == flag1) {
				chan.Ton_Slide_Delay = mod.buf[chan.Address_In_Pattern++]
				chan.Ton_Slide_Count = chan.Ton_Slide_Delay
				chan.Ton_Slide_Step = this.getWord(chan.Address_In_Pattern, modNum)
				chan.Address_In_Pattern += 2
				chan.SimpleGliss = true
				chan.Current_OnOff = 0
				if((chan.Ton_Slide_Count == 0) && (mod.PT3.Version >= 7))
					chan.Ton_Slide_Count++
			} else if(counter == flag2) {
				chan.SimpleGliss = false
				chan.Current_OnOff = 0
				chan.Ton_Slide_Delay = mod.buf[chan.Address_In_Pattern]
				chan.Ton_Slide_Count = chan.Ton_Slide_Delay
				chan.Address_In_Pattern += 3
				//chan.Ton_Slide_Step = Math.abs(short(this.getWord(mod.buf[chan.Address_In_Pattern], modNum)))
				chan.Ton_Slide_Step = Math.abs(this.getWord(chan.Address_In_Pattern, modNum))
				chan.Address_In_Pattern += 2
				chan.Ton_Delta = mod.notes[chan.Note] - mod.notes[prnote]//PT3_GetNoteFreq(info, chan.Note, chip_num) - PT3_GetNoteFreq(info, prnote, chip_num)
				chan.Slide_To_Note = chan.Note
				chan.Note = prnote
				if(mod.PT3.Version >= 6)
					chan.Current_Ton_Sliding = prsliding
				if((chan.Ton_Delta - chan.Current_Ton_Sliding) < 0)
					chan.Ton_Slide_Step = -chan.Ton_Slide_Step
			} else if(counter == flag3)	{
				chan.Position_In_Sample = mod.buf[chan.Address_In_Pattern++]
			} else if(counter == flag4) {
				chan.Position_In_Ornament = mod.buf[chan.Address_In_Pattern++]
			} else if(counter == flag5) {
				chan.OnOff_Delay = mod.buf[chan.Address_In_Pattern++]
				chan.OffOn_Delay = mod.buf[chan.Address_In_Pattern++]
				chan.Current_OnOff = chan.OnOff_Delay
				chan.Ton_Slide_Count = 0
				chan.Current_Ton_Sliding = 0
			} else if(counter == flag8) {
				mod.PT3.Env_Delay = mod.buf[chan.Address_In_Pattern++]
				mod.PT3.Cur_Env_Delay = mod.PT3.Env_Delay
				mod.PT3.Env_Slide_Add = this.getWord(chan.Address_In_Pattern, modNum)
				chan.Address_In_Pattern += 2
			} else if(counter == flag9) {
				mod.PT3.Delay = mod.buf[chan.Address_In_Pattern++]
			}
			counter--
		}
		chan.Note_Skip_Counter = chan.Number_Of_Notes_To_Skip // signed char
		console.log('chan.Note_Skip_Counter', chan.Note_Skip_Counter)
	}

	PT3_ChangeRegisters(chan, out, modNum) { // addEnv and tempmixer are out object
		const mod = this.mods[modNum]
		let j, b1, b0, w
		if(chan.Enabled) {
			chan.Ton = this.getWord(chan.SamplePointer + chan.Position_In_Sample * 4 + 2, modNum)
			chan.Ton += chan.Ton_Accumulator
			b0 = mod.buf[chan.SamplePointer + chan.Position_In_Sample * 4]
			b1 = mod.buf[chan.SamplePointer + chan.Position_In_Sample * 4 + 1]
			if((b1 & 0x40) != 0) {
				chan.Ton_Accumulator = chan.Ton
			}
			j = chan.Note + mod.buf[chan.OrnamentPointer + chan.Position_In_Ornament]
			if(j > 0x7F) // negative
				j = 0
			else if(j > 95) // max
				j = 95
			w = mod.notes[j]
			chan.Ton = (chan.Ton + chan.Current_Ton_Sliding + w) & 0xfff
			if(chan.Ton_Slide_Count > 0) {
				chan.Ton_Slide_Count--
				if(chan.Ton_Slide_Count == 0) {
					chan.Current_Ton_Sliding += chan.Ton_Slide_Step
					chan.Ton_Slide_Count = chan.Ton_Slide_Delay
					if(!chan.SimpleGliss) {
						if(((chan.Ton_Slide_Step < 0) && (chan.Current_Ton_Sliding <= chan.Ton_Delta)) || ((chan.Ton_Slide_Step >= 0) && (chan.Current_Ton_Sliding >= chan.Ton_Delta))) {
							chan.Note = chan.Slide_To_Note
							chan.Ton_Slide_Count = 0
							chan.Current_Ton_Sliding = 0
						}
					}
				}
			}
			chan.Amplitude = b1 & 0xf
			if((b0 & 0x80) != 0) {
				if((b0 & 0x40) != 0) {
					if(chan.Current_Amplitude_Sliding < 15)
						chan.Current_Amplitude_Sliding++
				} else if(chan.Current_Amplitude_Sliding > -15)	{
					chan.Current_Amplitude_Sliding--
				}
			}
			chan.Amplitude += chan.Current_Amplitude_Sliding
			if(chan.Amplitude > 0x7F) // negative
				chan.Amplitude = 0
			else if(chan.Amplitude > 15) // max
				chan.Amplitude = 15
			// todo: move to init
			if(mod.PT3.Version <= 4)
				chan.Amplitude = this.VER.PT3VolumeTable_33_34[chan.Volume][chan.Amplitude]
			else
				chan.Amplitude = this.VER.PT3VolumeTable_35[chan.Volume][chan.Amplitude]
			if(((b0 & 1) == 0) && chan.Envelope_Enabled)
				chan.Amplitude = chan.Amplitude | 16
			if((b1 & 0x80) != 0) {
				if((b0 & 0x20) != 0)
					j = ((b0 >> 1) | 0xf0) + chan.Current_Envelope_Sliding
				else
					j = ((b0 >> 1) & 0xf) + chan.Current_Envelope_Sliding
				if((b1 & 0x20) != 0)
					chan.Current_Envelope_Sliding = j
				out.AddToEnv += j
			} else {
				mod.PT3.AddToNoise = (b0 >> 1) + chan.Current_Noise_Sliding
				if((b1 & 0x20) != 0)
					chan.Current_Noise_Sliding = mod.PT3.AddToNoise
			}
			out.TempMixer = ((b1 >> 1) & 0x48) | out.TempMixer
			chan.Position_In_Sample++
			if(chan.Position_In_Sample >= chan.Sample_Length)
				chan.Position_In_Sample = chan.Loop_Sample_Position
			chan.Position_In_Ornament++
			if(chan.Position_In_Ornament >= chan.Ornament_Length)
				chan.Position_In_Ornament = chan.Loop_Ornament_Position
		} else
			chan.Amplitude = 0

		out.TempMixer = out.TempMixer >> 1
		if(chan.Current_OnOff > 0) {
			chan.Current_OnOff--
			if(chan.Current_OnOff == 0)	{
				chan.Enabled = !chan.Enabled
				if(chan.Enabled)
					chan.Current_OnOff = chan.OnOff_Delay
				else
					chan.Current_OnOff = chan.OffOn_Delay
			}
		}
	}

	PT3_Play_Chip(modNum) {
		const mod = this.mods[modNum]
		const out = {
			AddToEnv: 0,
			TempMixer: 0
		}

		mod.PT3.DelayCounter--
		//console.log('mod.PT3.DelayCounter', mod.PT3.DelayCounter)
		//console.log(mod.PT3_A.Note_Skip_Counter, mod.PT3_B.Note_Skip_Counter, mod.PT3_C.Note_Skip_Counter)
		if(mod.PT3.DelayCounter == 0) {
			// Channel A
			mod.PT3_A.Note_Skip_Counter--
			if(mod.PT3_A.Note_Skip_Counter == 0) {
				if(mod.buf[mod.PT3_A.Address_In_Pattern] == 0) {
					mod.PT3.CurrentPosition++
					if(mod.PT3.CurrentPosition == mod.PT3_NumberOfPositions)
						mod.PT3.CurrentPosition = mod.PT3_LoopPosition

					mod.PT3_A.Address_In_Pattern = mod.PT3_PatternsPointer + mod.PT3_PositionList[mod.PT3.CurrentPosition] * 2//this.getWord(mod.buf[mod.PT3_PatternsPointer + mod.PT3_PositionList[mod.PT3.CurrentPosition] * 2], modNum)//ay_sys_getword(&module[PT3_PatternsPointer + header->PT3_PositionList[PT3.CurrentPosition] * 2]);
					mod.PT3_B.Address_In_Pattern = mod.PT3_PatternsPointer + mod.PT3_PositionList[mod.PT3.CurrentPosition] * 2 + 2
					mod.PT3_C.Address_In_Pattern = mod.PT3_PatternsPointer + mod.PT3_PositionList[mod.PT3.CurrentPosition] * 2 + 4
					mod.PT3.Noise_Base = 0
				}
				this.PT3_PatternInterpreter(mod.PT3_A, modNum)
			}
			// Channel B
			mod.PT3_B.Note_Skip_Counter--
			if(mod.PT3_B.Note_Skip_Counter == 0)
				this.PT3_PatternInterpreter(mod.PT3_B, modNum)
			// Channel C
			mod.PT3_C.Note_Skip_Counter--
			if(mod.PT3_C.Note_Skip_Counter == 0)
				this.PT3_PatternInterpreter(mod.PT3_C, modNum)

			mod.PT3.DelayCounter = mod.PT3.Delay
		}

		out.AddToEnv = 0
		out.TempMixer = 0
		this.PT3_ChangeRegisters(mod.PT3_A, out, modNum)
		this.PT3_ChangeRegisters(mod.PT3_B, out, modNum)
		this.PT3_ChangeRegisters(mod.PT3_C, out, modNum)

		this.regs[modNum].AY_MIXER = out.TempMixer

		this.regs[modNum].AY_CHNL_A_FINE = mod.PT3_A.Ton & 0xff
		this.regs[modNum].AY_CHNL_A_COARSE = (mod.PT3_A.Ton >> 8) & 0xf
		this.regs[modNum].AY_CHNL_B_FINE = mod.PT3_B.Ton & 0xff
		this.regs[modNum].AY_CHNL_B_COARSE = (mod.PT3_B.Ton >> 8) & 0xf
		this.regs[modNum].AY_CHNL_C_FINE = mod.PT3_C.Ton & 0xff
		this.regs[modNum].AY_CHNL_C_COARSE = (mod.PT3_C.Ton >> 8) & 0xf
		this.regs[modNum].AY_CHNL_A_VOL = mod.PT3_A.Amplitude
		this.regs[modNum].AY_CHNL_B_VOL = mod.PT3_B.Amplitude
		this.regs[modNum].AY_CHNL_C_VOL = mod.PT3_C.Amplitude

		this.regs[modNum].AY_NOISE_PERIOD = (mod.PT3.Noise_Base + mod.PT3.AddToNoise) & 31
		const cur_env = this.getWord(mod.PT3.Env_Base_lo, modNum) + out.AddToEnv + mod.PT3.Cur_Env_Slide
		this.regs[modNum].AY_ENV_FINE = cur_env & 0xff
		this.regs[modNum].AY_ENV_COARSE = (cur_env >> 8) & 0xff

		if(mod.PT3.Cur_Env_Delay > 0) {
			mod.PT3.Cur_Env_Delay--
			if(mod.PT3.Cur_Env_Delay == 0) {
				mod.PT3.Cur_Env_Delay = mod.PT3.Env_Delay
				mod.PT3.Cur_Env_Slide += mod.PT3.Env_Slide_Add
			}
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
		
		this.PT3_Play_Chip(0)

		if(++this.frame >= this.frameCount) {
			this.loopCount++
			this.frame = this.loopFrame
		}

		const ret = [
			this.regs[0].AY_CHNL_A_FINE,
			this.regs[0].AY_CHNL_A_COARSE,
			this.regs[0].AY_CHNL_B_FINE,
			this.regs[0].AY_CHNL_B_COARSE,
			this.regs[0].AY_CHNL_C_FINE,
			this.regs[0].AY_CHNL_C_COARSE,
			this.regs[0].AY_NOISE_PERIOD,
			this.regs[0].AY_MIXER,
			this.regs[0].AY_CHNL_A_VOL,
			this.regs[0].AY_CHNL_B_VOL,
			this.regs[0].AY_CHNL_C_VOL,
			this.regs[0].AY_ENV_FINE,
			this.regs[0].AY_ENV_COARSE,
			this.regs[0].AY_ENV_SHAPE,
			this.regs[0].AY_GPIO_A,
			this.regs[0].AY_GPIO_B,
		]

		return ret
	}

}