/*
	Copyright (C) Dylan Muller: https://github.com/lunarjournal/emu8910
*/

export class FirFilter {
	constructor(h, m) {
		this.m = m
		this.h = h
		this.length = h.length * m
		this.index = 0
		this.offset = 0
		this.buffer = new Array(this.length * 2).fill(0)
		return this
	}
	step(samples) {
		const length = this.length
		const m = this.m
		const h = this.h
		let y = 0
		this.offset = length - (this.index * m)
		const sub = this.buffer.slice(this.offset)
		this.index = (this.index + 1) % (length / m - 1)
		for (let i = m - 1; i >= 0; i--) {
			this.buffer[this.offset + i] = samples[i]
		}
		for (let i = 0; i < h.length; i++) {
			y += h[i] * (sub[i] + sub[h.length - i - 1])
		}
		for (let i = 0; i < m; i++) {
			this.buffer[this.offset + length - m + i] = this.buffer[this.offset + i]
		}
		return y
	}
}