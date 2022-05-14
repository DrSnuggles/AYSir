/*
	by DrSnuggles
	based on: https://github.com/norbertkehrer/soundtrakker_player
	https://www.grimware.org/doku.php/documentations/software/soundtrakker/start
	https://www.grimware.org/doku.php/documentations/software/soundtrakker/dev.fileformat.128
	looks like Norbert Kehrer's files are version 128 because offsets match
*/
import {getStr} from './getStr.js'

export class BSCReader {

	// To translate musical keys to period length values
	key_to_tone_period = [
		3822, 3608, 3405, 3214, 3034, 2863,
		2703, 2551, 2408, 2273, 2145, 2025,
		1911, 1804, 1703, 1607, 1517, 1432,
		1351, 1276, 1204, 1136, 1073, 1012,
		956, 902, 851, 804, 758, 716,
		676, 638, 602, 568, 536, 506,
		478, 451, 426, 402, 379, 358,
		338, 319, 301, 284, 268, 253,
		239, 225, 213, 201, 190, 179,
		169, 159, 150, 142, 134, 127,
		119, 113, 106, 100, 95, 89,
		84, 80, 75, 71, 67, 63,
		60, 56, 53, 50, 47, 45,
		42, 40, 38, 36, 34, 32,
		30, 28, 27, 25, 24, 22,
		21, 20, 19, 18, 17, 16,
		15, 0, 0
	]

	// Addresses for the song data
	ADDR_BASE = 0x80
	ADDR_INSTRUMENTS = 0x80 + 0x000
	ADDR_ARPEGGI = 0x80 + 0x820
	ADDR_SONG_LIST = 0x80 + 0xa30
	ADDR_SONG_NAME = 0x80 + 0xa90
	ADDR_INSTR_NAMES = 0x80 + 0xa98
	ADDR_PATTERN_TRANSPOSE_TABLE = 0x80 + 0xb18
	ADDR_DELAY = 0x80 + 0xb7b
	ADDR_LOOP_TO = 0x80 + 0xb7c
	ADDR_PATTERN_LENGTH = 0x80 + 0xb7d
	ADDR_SONG_TRANSPOSE = 0x80 + 0xb7e
	ADDR_SONG_LENGTH = 0x80 + 0xb7f
	ADDR_PATTERNS = 0x80 + 0xb80

	// Hardware envelopes
	HARDW_ENV_OFF = 0
	HARDW_ENV_SAWTOOTH = 1 //not used
	HARDW_ENV_TRIANGLE = 2 //not used
	HARDW_ENV_VOLUME = 10 //not used

	// Arpeggio states
	NO_ARPEGGIO = 0
	ARPEGGIO_NUMBER = 1
	DIRECT_ARPEGGIO = 2

	// Song registers
	delay = 0
	loop_to = 0
	pattern_length = 0
	song_length = 0
	current_position_in_song_list = 0
	current_pattern_line = 0
	song_delay_counter = 0

	// Channel registers
	ch_current_instrument = []
	ch_current_instr_position = []
	ch_still_to_go = []
	ch_repeat_length = []
	ch_repeat_position = []
	ch_active_arpeggio = []
	ch_active_arpeggio_number = []
	ch_arpeggio_counter = []
	ch_arpeggio_add_1 = []
	ch_arpeggio_add_2 = []
	ch_effective_key_number_to_play = []
	ch_tone_period = []
	ch_volume = []
	ch_volume_reduction = []
	ch_hardware_envelope_flag = []
	ch_hardware_envelope_period = []
	ch_noise_period = []

	// The registers of the AY-3-8910 (16 wide !)
	ay_registers = [
		0x22, 0x22, // channel A tone period
		0x22, 0x22, // channel B tone period
		0x22, 0x22, // channel C tone period
		0x22, // noise period
		0xf8, // enable
		0x00, // channel A amplitude
		0x00, // channel B amplitude
		0x00, // channel C amplitude
		0x22, 0x22, // envelope period
		0x00,  // envelope shape
		0x00, 0x00
	]

	constructor(buf) {
		this.dump = new DataView(buf.buffer)
		this.loopCount = 0
		this.frame = 0
		
		this.init(buf)
	}

	init(buf) {
		this.rate = 50
		this.clock = 1000000
		
		this.delay = this.dump.getUint8(this.ADDR_DELAY)
		this.loop_to = this.dump.getUint8(this.ADDR_LOOP_TO)
		this.pattern_length = this.dump.getUint8(this.ADDR_PATTERN_LENGTH)
		this.song_transpose = this.dump.getUint8(this.ADDR_SONG_TRANSPOSE)
		this.song_length = this.dump.getUint8(this.ADDR_SONG_LENGTH)
		
		// its not really frames here, so length is incorrect :(
		this.frameCount = this.song_length * this.pattern_length // * this.rate

		this.title = getStr(buf, this.ADDR_SONG_NAME, 8)
		this.instrument_names = []
		for (let i = 0; i < 16; i++) {
			this.instrument_names[i] = getStr(buf, this.ADDR_INSTR_NAMES + 8 * i, 8)
		}

		this.song_delay_counter = this.delay
		this.current_position_in_song_list = 0
		this.current_pattern_line = 0
		for (let ch = 0; ch < 3; ch++) {
			this.ch_current_instrument[ch] = 0
			this.ch_current_instr_position[ch] = 0
			this.ch_still_to_go[ch] = 0
			this.ch_repeat_length[ch] = 0
			this.ch_repeat_position[ch] = 0
			this.ch_active_arpeggio[ch] = this.NO_ARPEGGIO
			this.ch_active_arpeggio_number[ch] = 0
			this.ch_arpeggio_counter[ch] = 0
			this.ch_arpeggio_add_1[ch] = 0
			this.ch_arpeggio_add_2[ch] = 0
			this.ch_effective_key_number_to_play[ch] = 0
			this.ch_tone_period[ch] = 0
			this.ch_volume[ch] = 0
			this.ch_volume_reduction[ch] = 0
			this.ch_hardware_envelope_flag[ch] = this.HARDW_ENV_OFF
			this.ch_hardware_envelope_period[ch] = 0
			this.ch_noise_period[ch] = 0
			this.setVol(ch, 0)
		}

		// helper
		function getStr(dump, ptr, len) { // fixed length
			let c, r = []
			for (let i = 0; i < len; i++) {
				r.push( String.fromCharCode( dump[ptr++] ) )
			}
			return r.join('')
		}
	}
	setVol(channel, vol) {
		if (channel < 3) {
			this.ay_registers[8 + channel] &= 0xf0
			this.ay_registers[8 + channel] |= (vol & 0x0f)
		}
	}
	setFrequency(channel, period) {
		if ((typeof period === "number") && (!isNaN(period)) && (channel < 3)) {
			this.ay_registers[channel * 2] = period & 0xff
			this.ay_registers[channel * 2 + 1] = (period >> 8) & 0x0f
		}
	}
	channelPlayEach50HzStep(ch) {
		if (this.ch_still_to_go[ch] <= 0) {
			if (this.ch_repeat_length[ch] === 0) {
				return
			}
			this.ch_still_to_go[ch] = this.ch_repeat_length[ch]
			this.ch_current_instr_position[ch] = this.ch_repeat_position[ch]
		}
		const instr_position = this.ch_current_instr_position[ch]
		this.ch_current_instr_position[ch]++
		this.ch_still_to_go[ch]--
	
		// set the tone period based on the key
		this.ch_tone_period[ch] = this.key_to_tone_period[this.ch_effective_key_number_to_play[ch]]
	
		// Arpeggio 0xx and Fxx
		if (this.ch_active_arpeggio[ch] !== this.NO_ARPEGGIO) {
			let delta_to_add_to_key = 0
			switch (this.ch_active_arpeggio[ch]) {
				case this.DIRECT_ARPEGGIO: // not available in Soundtraker 1.x
					//console.log('128 command DIRECT_ARPEGGIO', ch, this.ch_arpeggio_counter[ch])
					switch (this.ch_arpeggio_counter[ch]) {
						case 1:
							delta_to_add_to_key = this.ch_arpeggio_add_1[ch]
							break
						case 2:
							delta_to_add_to_key = this.ch_arpeggio_add_2[ch]
							break
						default:
							delta_to_add_to_key = 0
							break
					}
					this.ch_arpeggio_counter[ch]++
					if (this.ch_arpeggio_counter[ch] >= 3) {
						this.ch_arpeggio_counter[ch] = 0
					}
					break
				case this.ARPEGGIO_NUMBER:
					delta_to_add_to_key = this.dump.getInt8(this.ADDR_ARPEGGI + this.ch_active_arpeggio_number[ch] * 32 + instr_position)
					break
			}
			const new_key = this.ch_effective_key_number_to_play[ch] + delta_to_add_to_key
			this.ch_tone_period[ch] = this.key_to_tone_period[new_key]
		}
	
		// Tone envelope
		//const tone_add_l = this.dump.getUint8(this.ADDR_INSTRUMENTS + this.ch_current_instrument[ch] * 0x82 + 64 + 2 * instr_position)
		//const tone_add_h = this.dump.getUint8(this.ADDR_INSTRUMENTS + this.ch_current_instrument[ch] * 0x82 + 64 + 2 * instr_position + 1)
		//let tone_add = ((tone_add_h << 8) | (tone_add_l & 0xff)) & 0xffff
		let tone_add = this.dump.getUint16(this.ADDR_INSTRUMENTS + this.ch_current_instrument[ch] * 0x82 + 64 + 2 * instr_position, true)
		if (tone_add > 0x7fff) {
			tone_add = -(0x10000 - tone_add)
		}
		this.ch_tone_period[ch] += tone_add
	
		// Volume Envelope
		let volume_to_set = this.dump.getUint8(this.ADDR_INSTRUMENTS + this.ch_current_instrument[ch] * 0x82 + instr_position)
		if (volume_to_set < 128) {
			volume_to_set &= 0x0f
			volume_to_set -= this.ch_volume_reduction[ch]
			if (volume_to_set < 0) {
				volume_to_set = 0
			}
			this.ch_volume[ch] = volume_to_set
		}
	
		// Noise envelope
		const noise_period = this.dump.getUint8(this.ADDR_INSTRUMENTS + this.ch_current_instrument[ch] * 0x82 + 32 + instr_position)
		if (noise_period < 128) { // >= 128 means: ignore the data from the instrument
			this.ch_noise_period[ch] = noise_period & 0x1f
		}
	}
	noiseHardwEnvPlayEach50HzStep() {
		// Loop over the channels to clear all noise and hardware envelope
		for (let i = 0; i < 3; i++) {
			const noise_bit = 1 << (3 + i)
			this.ay_registers[7] |= noise_bit
			this.ay_registers[8 + i] &= 0x0f
		}
		// Loop over the channels to set them, where needed
		for (let i = 0; i < 3; i++) {
			// Noise envelope
			if (this.ch_noise_period[i] !== 0) {
				const noise_bit = 1 << (3 + i)
				this.ay_registers[6] = this.ch_noise_period[i]
				this.ay_registers[7] &= ((noise_bit ^ 0xff) & 0xff)
			}
			// Hardware envelope
			if (this.ch_hardware_envelope_flag[i] !== this.HARDW_ENV_OFF) {
				//if (i === 0) console.log(i, this.ch_hardware_envelope_flag[i], this.ay_registers[8 + i])
				this.ay_registers[8 + i] |= 0xf // 0x10 // mit 8+ 2 geht es - probiere lied led-zep??
				this.ay_registers[13] = this.ch_hardware_envelope_flag[i]
				this.ay_registers[11] = this.ch_hardware_envelope_period[i]
				this.ay_registers[12] = 0
			}
		}
	}
	channelPlayEachPatternLine(ch) {
		// get the key in the pattern and process it
		let key_number = 0
		const my_pattern_address = this.ADDR_PATTERNS + this.current_pattern * this.pattern_length * 9 + this.current_pattern_line * 9 + ch * 3
		const key = this.dump.getUint8(my_pattern_address)
		const key_code = (key >> 4) & 0x0f
		const octave = (key & 0x0f) - 1
	
		if (key === 0xd0) {
			this.ch_still_to_go[ch] = 0
			this.ch_repeat_length[ch] = 0
		}
		else {
			if ((key !== 0x00) && (octave < 9)) {
				key_number = 12 * octave + key_code - 1
				this.ch_current_instr_position[ch] = 0
				const instr = (this.dump.getUint8(my_pattern_address + 1) >> 4) & 0x0f
				this.ch_current_instrument[ch] = instr
				this.ch_repeat_position[ch] = this.dump.getUint8(this.ADDR_INSTRUMENTS + instr * 0x82 + 0x80)
				this.ch_repeat_length[ch] = this.dump.getUint8(this.ADDR_INSTRUMENTS + instr * 0x82 + 0x81)
				this.ch_still_to_go[ch] = 32
				this.ch_current_instr_position[ch] = 0
				this.ch_volume[ch] = 0
				this.ch_volume_reduction[ch] = 0
			}
		}
	
		// done, if key is zero
		if (key_number === 0) {
			return
		}
	
		const effect = this.dump.getUint8(my_pattern_address + 1) & 0x0f
		const par = this.dump.getUint8(my_pattern_address + 2) & 0xff
//if (ch == 0) console.log(ch, key_number, effect.toString(16), par.toString(16))
		// set effects
		switch (effect) {
			case 0x1:   // Arpeggio off
				this.ch_active_arpeggio[ch] = this.NO_ARPEGGIO
				this.ch_hardware_envelope_flag[ch] = this.HARDW_ENV_OFF
				break
			case 0x8:   // Sawtooth
			case 0xc:
			case 0xa:   // Triangle
			case 0xe:
				this.ch_active_arpeggio[ch] = this.NO_ARPEGGIO
				this.ch_hardware_envelope_flag[ch] = effect
				this.ch_hardware_envelope_period[ch] = par
				break
			case 0xb:
				this.ch_volume_reduction[ch] = 15 - (par & 0x0f)
				break
			case 0xd:
				this.delay = (par & 0x0f)
				break
			case 0xf:   // Use arpeggio number
				this.ch_active_arpeggio[ch] = this.ARPEGGIO_NUMBER
				this.ch_active_arpeggio_number[ch] = par & 0x0f
				this.ch_hardware_envelope_flag[ch] = this.HARDW_ENV_OFF
				break
			default:
				break
		}
	
		const song_transpose = this.dump.getInt8(this.ADDR_SONG_TRANSPOSE)
		const pattern_transpose = this.dump.getInt8(this.ADDR_PATTERN_TRANSPOSE_TABLE + this.current_position_in_song_list)
	
		key_number += song_transpose + pattern_transpose
	
		this.ch_effective_key_number_to_play[ch] = key_number
	
		// set the tone period
		this.ch_tone_period[ch] = this.key_to_tone_period[key_number]
	}
	getNextFrame() {
		// interrupt
		//if (this.frame > this.frameCount) this.frameCount = 0

		// needed to make jump to pos possible
		this.current_position_in_song_list = Math.floor(this.frame / this.pattern_length)
		this.current_pattern_line = this.frame - this.current_position_in_song_list * this.pattern_length
		
		const chCnt = 3 // set back to 3 later ;)
		// Loop over the 3 channels for the things to do in each interrupt
		for (let i = 0; i < chCnt; i++) {
			this.channelPlayEach50HzStep(i)
		}

		// Do the stuff for the noise generator and the hardware envelope in each interrupt
		this.noiseHardwEnvPlayEach50HzStep()

		// Loop over the 3 channels to set AY registers
		for (let i = 0; i < chCnt; i++) {
			this.setVol(i, this.ch_volume[i])
			this.setFrequency(i, this.ch_tone_period[i])
		}

		// Update counter for tempo of song
		this.song_delay_counter--
		if (this.song_delay_counter > 0) {
			return this.ay_registers
		}
		this.song_delay_counter = this.delay

		// Set number of currently playing pattern
		this.current_pattern = this.dump.getInt8(this.ADDR_SONG_LIST + this.current_position_in_song_list)
		//this.frame = this.current_pattern_line + this.current_position_in_song_list * this.pattern_length
		this.frame++

		// Loop over the 3 channels for the things to do in each pattern line
		for (let i = 0; i < chCnt; i++) {
			this.channelPlayEachPatternLine(i)
		}
		// Update counter for the pattern lines
		this.current_pattern_line++
		if (this.current_pattern_line < this.pattern_length) {
			return this.ay_registers
		}

		// When pattern is over, reset volume reduction to 0
		this.ch_volume_reduction[0] = 0
		this.ch_volume_reduction[1] = 0
		this.ch_volume_reduction[2] = 0

		// When pattern is over, go to the next position in the song list
		this.current_pattern_line = 0
		this.current_position_in_song_list++
		if (this.current_position_in_song_list >= this.song_length) {
			this.current_position_in_song_list = this.loop_to
			this.loopCount++
		}

		// Switch off arpeggio and hardware envelopes, when pattern ends
		for (let i = 0; i < chCnt; i++) {
			this.ch_active_arpeggio[i] = this.NO_ARPEGGIO
			this.ch_hardware_envelope_flag[i] = this.HARDW_ENV_OFF
			//ch_volume[i] = 0
		}

		return this.ay_registers
	}

}