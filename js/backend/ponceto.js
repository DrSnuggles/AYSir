/*
	Copyright (C) Olivier PONCET: https://github.com/ponceto/aym-js
	https://github.com/ponceto/aym-js/blob/master/src/static/vendor/aym-js/js/aym-player-processor.js

	aym-player-processor.js - Copyright (c) 2001-2024 - Olivier Poncet
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 2 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { AYM_Emulator } from './ponceto-emulator.js'
import {STEREO_MODES} from './stereo_modes.js'

// ---------------------------------------------------------------------------
// Some useful constants
// ---------------------------------------------------------------------------

const AYM_FLAG_RESET = 0x01
const AYM_FLAG_PAUSE = 0x02
const AYM_FLAG_MUTEA = 0x10
const AYM_FLAG_MUTEB = 0x20
const AYM_FLAG_MUTEC = 0x40

// ---------------------------------------------------------------------------
// AYM_Processor
// ---------------------------------------------------------------------------

class AYM_PlayerProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super()
		this.port.onmessage = this.handleMessage_.bind(this)
		this.deviceSampleRate = 48000
		this.panning = STEREO_MODES['ACB']

		this.chip        = new AYM_Emulator({})
		this.chip_flags  = 0
		this.chip_ticks  = 0
		this.chip_clock  = 0
		this.music       = null
		this.music_index = -1
		this.music_count = 0
		this.music_ticks = 0
		this.music_clock = 0
		this.channel_a   = null
		this.channel_b   = null
		this.channel_c   = null
		this.setChipMasterClock(1000000)
		
		return this
	}
	setChipMasterClock(master_clock) {
		this.chip_clock = this.chip.set_master_clock(master_clock)
		this.chip.reset()
	}

	hasReset() {
		if((this.chip_flags & AYM_FLAG_RESET) != 0) {
			this.chip_flags &= ~AYM_FLAG_RESET
			this.chip_ticks &= 0
			this.chip.reset()
			return true
		}
		return false
	}

	hasPause() {
		if((this.chip_flags & AYM_FLAG_PAUSE) != 0) {
			return true
		}
		return false
	}
	process(inputs, outputs, parameters) {
		if(this.hasReset() || this.hasPause()) {
			return true
		}

		const numSamples = () => {
			if(outputs.length > 0) {
				const output0 = outputs[0]
				if(output0.length > 0) {
					const channel0 = output0[0]
					if(channel0.length > 0) {
						return channel0.length
					}
				}
			}
			return 128
		}

		const getChannelA = (samples) => {
			if((this.channel_a == null) || (this.channel_a.length < samples)) {
				this.channel_a = new Float32Array(samples)
			}
			return this.channel_a
		}

		const getChannelB = (samples) => {
			if((this.channel_b == null) || (this.channel_b.length < samples)) {
				this.channel_b = new Float32Array(samples)
			}
			return this.channel_b
		}

		const getChannelC = (samples) => {
			if((this.channel_c == null) || (this.channel_c.length < samples)) {
				this.channel_c = new Float32Array(samples)
			}
			return this.channel_c
		}

		const samples   = numSamples()
		const channel_a = getChannelA(samples)
		const channel_b = getChannelB(samples)
		const channel_c = getChannelC(samples)

		const mixMono = (channel) => {
			for(let sample = 0; sample < samples; ++sample) {
				let output = 0
				if((this.chip_flags & AYM_FLAG_MUTEA) == 0) {
					output += channel_a[sample]
				}
				if((this.chip_flags & AYM_FLAG_MUTEB) == 0) {
					output += channel_b[sample]
				}
				if((this.chip_flags & AYM_FLAG_MUTEC) == 0) {
					output += channel_c[sample]
				}
				output /= 3.0
				channel[sample] = ((output * 2.0) - 1.0)
			}
		}

		const mixStereo = (channel1, channel2) => {
			for(let sample = 0; sample < samples; ++sample) {
				let output1 = 0
				let output2 = 0
				if((this.chip_flags & AYM_FLAG_MUTEA) == 0) {
					output1 += (channel_a[sample] * (1-this.panning[0]))
					output2 += (channel_a[sample] * this.panning[0])
				}
				if((this.chip_flags & AYM_FLAG_MUTEB) == 0) {
					output1 += (channel_b[sample] * (1-this.panning[1]))
					output2 += (channel_b[sample] * this.panning[1])
				}
				if((this.chip_flags & AYM_FLAG_MUTEC) == 0) {
					output1 += (channel_c[sample] * (1-this.panning[2]))
					output2 += (channel_c[sample] * this.panning[2])
				}
				output1 /= 1.5
				output2 /= 1.5
				channel1[sample] = ((output1 * 2.0) - 1.0)
				channel2[sample] = ((output2 * 2.0) - 1.0)
			}
		}

		const clockChip = () => {
			for(let sample = 0; sample < samples; ++sample) {
				channel_a[sample] = this.chip.get_channel0()
				channel_b[sample] = this.chip.get_channel1()
				channel_c[sample] = this.chip.get_channel2()
				while(this.chip_ticks < this.chip_clock) {
					this.chip_ticks += sampleRate
					this.chip.clock()
				}
				this.chip_ticks -= this.chip_clock
			}
			for(const output of outputs) {
				if(output.length >= 2) {
					mixStereo(output[0], output[1])
					continue
				}
				if(output.length >= 1) {
					mixMono(output[0])
					continue
				}
			}
			return true
		}

		return clockChip()
	}

	configure(isYM, clockRate, sr, panMode = 'ACB') {
		console.log(isYM, clockRate, sr, panMode)

		this.panning = STEREO_MODES[panMode.toUpperCase()]
		this.setChipMasterClock(clockRate)
		//this.deviceSampleRate = sr
	
		console.info('Ponceto backend set to YM:', isYM, ' panning:', this.panning)
	}

	handleMessage_(event) {
		//console.log('[Processor:Received] ',event.data.msg, event.data.a?.length)
		let r = event.data.a
		switch (event.data.msg) {
			case 'configure':
				this.configure(r[0], r[1], r[2], r[3])
				break
			case 'stop':
				r = [0,0,0,0,0,0,0,0,0,0,0,0,0,0]
				// intentional fall through
			case 'regs': // FYM 14 regs block, YM can also have 16, or turbo = n x 14
				for (let i = 0, e = Math.min(r.length, 14); i < e; i++) {
					this.chip.set_register_index(i)
					this.chip.set_register_value(r[i])
				}
				break
			case 'write':
				r = event.data.r
				const v = event.data.v
				this.chip.set_register_index(r)
				this.chip.set_register_value(v)
				break
			default:
				console.log('Received unknown message from Worker',event.data.msg, event.data.a?.length)
		}
	} // handleMessage_
}

registerProcessor('ponceto-audio-processor', AYM_PlayerProcessor)
