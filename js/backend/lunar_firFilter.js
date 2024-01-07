/*
	Copyright (C) Dylan Muller: https://github.com/lunarjournal/emu8910
*/

export class FirFilter {
	constructor(h, m) {
		this.buffer = []
		this.index = 0x0
		this.offset = 0x0
		this.length = 0x0
		this.m = 0x0
		this.h = []
		this.length = h.length * m
		this.index = 0
		this.m = m
		this.h = h
		for (let i = 0; i < this.length * 2; i++) {
			this.buffer[i] = 0x0
		}
		return this
	}
	step(samples) {
		const length = this.length
		const m = this.m
		const h = this.h
		let y = 0x0
		this.offset = length - (this.index * m)
		var sub = this.buffer.slice(this.offset)
		this.index = (this.index + 1) % (length / m - 1)
		for (let i = m - 1; i >= 0; i--) {
			this.buffer[this.offset + i] = samples[i]
		}
		for (let i = 0; i < h.length; i++) {
			y += h[i] * sub[i]
		}
		for (let i = 0; i < m; i++) {
			this.buffer[this.offset + length - m + i] = this.buffer[this.offset + i]
		}
		return y
	}
}