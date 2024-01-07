/*
	Touched by: DrSnuggles
	Copyright (C) Dylan Muller: https://github.com/lunarjournal/emu8910
*/

export class BiasFilter {
	constructor(length, attenuate) {
		this.samples = new Array(length).fill(0)
		this.attenuate = attenuate
		this.index = 0
		this.sum = 0
		return this
	}
	step(x) {
		const delta = x - this.samples[this.index]
		this.sum += delta
		this.samples[this.index] = x
		if (++this.index > (this.samples.length - 1)) {
			this.index = 0
		}
		const avg = this.sum / this.samples.length
		return (x - avg) * (1 / this.attenuate)
	}
}