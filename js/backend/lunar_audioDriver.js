/*
	DrSnuggles: this is different from all the other AY8910 emulations i know
	Copyright (C) Dylan Muller: https://github.com/lunarjournal/emu8910

	NOT USED !!!
	
*/
import {BiasFilter} from './lunar_biasFilter.js'

export class AudioDriver {
	constructor(host) {
		this.frequency = 0x0
		this.host = host
		this.bias = 0
		this.update = this.update_.bind(this)
		this.device = new AudioContext()

		return this.gotContext()
	}
	gotContext() {
		// DrS: the bias filters have .step() but the Biquads are stereo WebAudio filters
		this.filter = [
			new BiasFilter(1024, 1.25),
			new BiasFilter(1024, 1.25),
			this.device.createBiquadFilter(),
			this.device.createBiquadFilter()
		]
		var filter = this.filter
		filter[2].type = "lowshelf"
		filter[2].frequency.value = 10000
		filter[2].gain.value = 2
		filter[3].type = "lowpass"
		filter[3].frequency.value = 10000
		filter[3].Q.value = 1
		this.frequency = this.device.sampleRate
		this.context = this.device.createScriptProcessor(4096, 0, 2)
		this.context.onaudioprocess = this.update
		this.context.connect(filter[2])
		filter[2].connect(filter[3])
		filter[3].connect(device.destination)
		return this
	}
	update_(ev) {
		const ch0 = ev.outputBuffer.getChannelData(0)
		const ch1 = ev.outputBuffer.getChannelData(1)
		const host = this.host
		const filter = this.filter
		const bias = this.bias
		let output = [0, 0]
		let port = [0, 0]
		for (let i = 0; i < ch0.length; i++) {
			output = host.step()
			port[0] = filter[0].step(output[0])
			port[1] = filter[1].step(output[1])
			ch0[i] = bias + port[0]
			ch1[i] = bias + port[1]
		}
	}
}