/*
	AudioWorklet: DrSnuggles
	Copyright (C) Dylan Muller: https://github.com/lunarjournal/emu8910
*/
import {Interpolator} from './lunar_interpolator.js'
import {FirFilter} from './lunar_firFilter.js'
import {BiasFilter} from './lunar_biasFilter.js'

const 	// See: https://www.arc.id.au/FilterDesign.html
FIR = [-0.011368,
	0.004512,
	0.008657,
	-0.011763,
	-0.000000,
	0.012786,
	-0.010231,
	-0.005801,
	0.015915,
	-0.006411,
	-0.012504,
	0.017299,
	-0.000000,
	-0.019605,
	0.016077,
	0.009370,
	-0.026526,
	0.011074,
	0.022508,
	-0.032676,
	0.000000,
	0.042011,
	-0.037513,
	-0.024362,
	0.079577,
	-0.040604,
	-0.112540,
	0.294080,
	0.625000,
	0.294080,
	-0.112540,
	-0.040604,
	0.079577,
	-0.024362,
	-0.037513,
	0.042011,
	0.000000,
	-0.032676,
	0.022508,
	0.011074,
	-0.026526,
	0.009370,
	0.016077,
	-0.019605,
	-0.000000,
	0.017299,
	-0.012504,
	-0.006411,
	0.015915,
	-0.005801,
	-0.010231,
	0.012786,
	-0.000000,
	-0.011763,
	0.008657,
	0.004512,
	-0.011368
],
STEREO_MODES = { // from Gasman / Demozoo
	'ABC': [0.25, 0.5, 0.75],
	'ACB': [0.25, 0.75, 0.5],
	'BAC': [0.5, 0.25, 0.75],
	'BCA': [0.75, 0.25, 0.5],
	'CAB': [0.5, 0.75, 0.25],
	'CBA': [0.75, 0.5, 0.25],
	'MONO': [0.5, 0.5, 0.5]
}

class PSG49 extends AudioWorkletProcessor {
	constructor() {
		super()
		this.port.onmessage = this.handleMessage_.bind(this)
		this.deviceSampleRate = 48000

		// main register file
		this.register = {
			A_FINE: 0x0, A_COARSE: 0x0,
			B_FINE: 0x0, B_COARSE: 0x0,
			C_FINE: 0x0, C_COARSE: 0x0,
			NOISE_PERIOD: 0x0,
			// bit position
			// 5  4  3  2  1  0
			// NC NB NA TC TB TA
			// T = Tone, N = Noise
			MIXER: 0x0,
			A_VOL: 0x0,
			B_VOL: 0x0,
			C_VOL: 0x0,
			ENV_FINE: 0x0, ENV_COARSE: 0x0,
			ENV_SHAPE: 0x0,
			PORT_A: 0x0,
			PORT_B: 0x0
		}
		// this.driver = new AudioDriver(this)
		this.interpolate = [
			new Interpolator(),
			new Interpolator()
		]
		var m = 8
		this.fir = [
			new FirFilter(FIR, m),
			new FirFilter(FIR, m)
		]
		this.bias = [
			new BiasFilter(1024, 1.25),
			new BiasFilter(1024, 1.25),
		]
		this.oversample = m
		this.clock = {
			frequency: 1750000,	// clockrate
			scale: 1 / 16 * 2,
			cycle: 0,
			step: 0
		}
		this.interrupt = {
			frequency: 50,	// intRate 50 Hz
			cycle: 0,
			routine: function () { }
		}
		this.envelope = {
			strobe: 0,
			transient: 0,
			step: 0,
			shape: 0,
			offset: 0,
			stub: []
		}
		this.channels = [
			{
				counter: 0x0,
				pan: 0.5,
			},
			{
				counter: 0x0,
				pan: 0.5
			},
			{
				counter: 0x0,
				pan: 0.5
			},
			{ counter: 0x0 }
		]
		// seed noise generator
		this.channels[3].port = 0x1
		this.dac = []
		this.build_dac(1.3, 40)
		this.build_adsr()

		return this
	}

	build_dac(decay, shift) {
		var dac = this.dac
		var y = Math.sqrt(decay)
		var z = shift / 31
		dac[0] = 0
		dac[1] = 0
		for (var i = 2; i <= 31; i++) {
			dac[i] = 1.0 / Math.pow(y, shift - (z * i))
		}
	}
	init_test() {
		var r = this.register
		r.MIXER = 56
		r.A_VOL = 15
		//r.A_VOL |= 0x10
		r.A_FINE = 200
		//r.ENV_COARSE = 200
	}
	build_adsr() {
		var envelope = this.envelope
		var stub = envelope.stub
		stub.reset = function (ev) {
			var strobe = ev.strobe
			var transient = ev.transient
			switch (ev.offset) {
				case 0x4:
					transient = 0
				case 0x0:
					ev.step = strobe ? transient : 31
					break
				case 0x5:
					transient = 31
				case 0x1:
					ev.step = strobe ? transient : 0
					break
				case 0x2:
					ev.step = 31
					break
				case 0x3:
					ev.step = 0
					break
			}
		}
		stub.grow = function (ev) {
			if (++ev.step > 31) {
				ev.strobe ^= 1
				ev.stub.reset(ev)
			}
		}
		stub.decay = function (ev) {
			if (--ev.step < 0) {
				ev.strobe ^= 1
				ev.stub.reset(ev)
			}
		}
		stub.hold = function (ev) { }
		envelope.matrix = [
			[stub.decay, stub.hold],
			[stub.grow, stub.hold],
			[stub.decay, stub.decay],
			[stub.grow, stub.grow],
			[stub.decay, stub.grow],
			[stub.grow, stub.decay],
		]
	}
	clamp() {
		var r = this.register
		r.A_FINE &= 0xff
		r.B_FINE &= 0xff
		r.C_FINE &= 0xff
		r.ENV_FINE &= 0xff
		r.A_COARSE &= 0xf
		r.B_COARSE &= 0xf
		r.C_COARSE &= 0xf
		r.ENV_COARSE &= 0xff
		r.A_VOL &= 0x1f
		r.B_VOL &= 0x1f
		r.C_VOL &= 0x1f
		r.NOISE_PERIOD &= 0x1f
		r.MIXER &= 0x3f
		r.ENV_SHAPE &= 0xff
	}
	map() {
		var r = this.register
		var channel = this.channels
		var ev = this.envelope
		var toneMask = [0x1, 0x2, 0x4]
		var noiseMask = [0x8, 0x10, 0x20]
		this.clamp()
		// update tone channel period
		channel[0].period = r.A_FINE | r.A_COARSE << 8;
		channel[1].period = r.B_FINE | r.B_COARSE << 8
		channel[2].period = r.C_FINE | r.C_COARSE << 8
		channel[0].volume = r.A_VOL & 0xf
		channel[1].volume = r.B_VOL & 0xf
		channel[2].volume = r.C_VOL & 0xf
		for (var i = 0; i < 3; i++) {
			var bit = r.MIXER & toneMask[i];
			channel[i].tone = bit ? 1 : 0
		}
		for (var i = 0; i < 3; i++) {
			var bit = r.MIXER & noiseMask[i];
			channel[i].noise = bit ? 1 : 0
		}
		channel[0].envelope = (r.A_VOL & 0x10) ? 0 : 1
		channel[1].envelope = (r.B_VOL & 0x10) ? 0 : 1
		channel[2].envelope = (r.C_VOL & 0x10) ? 0 : 1
		// update channel noise period
		channel[3].period = r.NOISE_PERIOD << 1
		ev.period = r.ENV_FINE | r.ENV_COARSE << 8
		ev.shape = r.ENV_SHAPE
		switch (ev.shape) {
			case 0x0:
			case 0x1:
			case 0x2:
			case 0x3:
			case 0x9:
				ev.transient = 0
				ev.offset = 0
				r.ENV_SHAPE = 0xff
				break
			case 0xb:
				ev.transient = 31
				ev.offset = 0
				r.ENV_SHAPE = 0xff
				break
			case 0x4:
			case 0x5:
			case 0x6:
			case 0x7:
			case 0xf:
				ev.transient = 0
				ev.offset = 1
				r.ENV_SHAPE = 0xff
			case 0xd:
				ev.transient = 31
				ev.offset = 1
				r.ENV_SHAPE = 0xff
				break
			case 0x8:
				ev.offset = 2
				break
			case 0xc:
				ev.offset = 3
				break
			case 0xa:
				ev.offset = 4
				break
			case 0xe:
				ev.offset = 5
				break
		}
		if (ev.shape != ev.store) {
			ev.strobe = 0x0
			ev.counter = 0x0
			ev.stub.reset(ev)
		}
		ev.store = r.ENV_SHAPE
	}
	step_tone(index) {
		var ch = this.channels[index % 3]
		var step = this.clock.step
		var port = ch.port
		var period = (ch.period == 0x0) ? 0x1 : ch.period
		ch.counter += step
		if (ch.counter >= period) {
			// 50% duty cycle
			port ^= 0x1
			ch.port = port
			ch.counter = 0x0
		}
		return ch.port
	}
	step_envelope = function () {
		var step = this.clock.step
		var ev = this.envelope
		ev.counter += step
		if (ev.counter >= ev.period) {
			ev.matrix[ev.offset][ev.strobe](ev)
			ev.counter = 0x0
		}
		return (ev.step)
	}
	step_noise() {
		var ch = this.channels[3]
		var step = this.clock.step
		var port = ch.port
		var period = (ch.period == 0) ? 1 : ch.period
		ch.counter += step
		if (ch.counter >= period) {
			port ^= (((port & 1) ^ ((port >> 3) & 1)) << 17)
			port >>= 1
			ch.port = port
			ch.counter = 0x0
		}
		return ch.port & 1
	}
	step_mixer() {
		var port = 0x0
		var output = [0.0, 0.0]
		var index = 0x0
		var ch = this.channels
		var noise = this.step_noise()
		var step = this.step_envelope()
		for (var i = 0; i < 3; i++) {
			var volume = ch[i].volume
			var pan = ch[i].pan
			port = this.step_tone(i) | ch[i].tone
			port &= noise | ch[i].noise
			// todo: add dac volume table
			//bit*=toneChannel[i].volume
			// mix each channel
			if (!ch[i].envelope) {
				index = step
			}
			else {
				index = volume * 2 + 1
			}
			port *= this.dac[index]
			// clamp pan levels
			// distortion over +1 ?
			if (pan > 0.9) {
				pan = 0.9
			}
			else if (pan < 0.1) {
				pan = 0.1
			}
			output[0] += port * (1 - pan)
			output[1] += port * (pan)
		}
		return output
	}
	step() {
		var output = []
		var clockStep = 0
		var intStep = 0
		var i = 0x0
		var clock = this.clock
		var driver = this.driver
		var fir = this.fir
		var oversample = this.oversample
		var interpolate = this.interpolate
		var interrupt = this.interrupt
		var x = clock.scale
		var fc = clock.frequency
		var fd = this.deviceSampleRate
		var fi = interrupt.frequency
		clockStep = (fc * x) / fd
		clock.step = clockStep / oversample
		intStep = fi / fd
		// add number of clock cycle
		interrupt.cycle += intStep
		// do we have clock cycles to process?
		// if so process single clock cycle
		var sample_left = []
		var sample_right = []
		for (i = 0; i < oversample; i++) {
			sample_left[i] = 0x0
			sample_right[i] = 0x0
		}
		if (interrupt.cycle > 1) {
			interrupt.cycle--
			interrupt.routine()
			interrupt.cycle = 0
		}
		for (var i_1 = 0; i_1 < oversample; i_1++) {
			clock.cycle += clockStep
			if (clock.cycle > 1) {
				clock.cycle--
				this.map()
				output = this.step_mixer()
				interpolate[0].step(output[0])
				interpolate[1].step(output[1])
			}
			sample_left[i_1] = interpolate[0].cubic(0.5)
			sample_right[i_1] = interpolate[1].cubic(0.5)
		}
		output[0] = fir[0].step(sample_left)
		output[1] = fir[1].step(sample_right)
		return output
	}

	process(inputList, outputList, parameters) {
		const outputCount = outputList.length
		const channelCount = outputList[0].length
		const bufferSize = outputList[0][0].length
		const bias = 0
//    console.log('ouputs', outputCount, 'channels', channelCount, 'bufferSize', bufferSize)
		for(let i = 0; i < bufferSize; i++) {
			const vals = this.step()
			outputList[0][0][i] = bias + this.bias[0].step(vals[0])
			outputList[1][0][i] = bias + this.bias[1].step(vals[1])
		}

		return true // def. needed for Chrome
	}

	configure(isYM, clockRate, sr, panMode = 'MONO') {
		//console.log(isYM, clockRate, sr, panMode)

		this.clock.frequency = clockRate
		this.deviceSampleRate = sr

		const panning = STEREO_MODES[panMode.toUpperCase()]
		this.channels[0].pan = panning[0]
		this.channels[1].pan = panning[1]
		this.channels[2].pan = panning[2]
		
		console.info('Lunar backend set to YM:', isYM, ' panning:', panning)
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
				this.register.A_FINE = r[0]
				this.register.A_COARSE = r[1]
		
				this.register.B_FINE = r[2]
				this.register.B_COARSE = r[3]
		
				this.register.C_FINE = r[4]
				this.register.C_COARSE = r[5]
				this.register.NOISE_PERIOD = r[6]
		
				this.register.MIXER = r[7]
		
				this.register.A_VOL = r[8]
				this.register.B_VOL = r[9]
				this.register.C_VOL = r[10]
		
				this.register.ENV_FINE = r[11]
				this.register.ENV_COARSE = r[12]
		
				if (r[13] != 0xff) {
					this.register.ENV_SHAPE = r[13]
				}
				break
			default:
				console.log('Received unknown message from Worker',event.data.msg, event.data.a?.length)
		}
	} // handleMessage_
}

registerProcessor('lunar-audio-processor', PSG49)
