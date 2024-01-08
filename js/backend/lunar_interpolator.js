/*
	Copyright (C) Dylan Muller: https://github.com/lunarjournal/emu8910
*/

export class Interpolator {
	constructor() {
		this.buffer = new Array(4).fill(0)
		return this
	}
	step(x) {
		let b = this.buffer
		b[0] = b[1]
		b[1] = b[2]
		b[2] = b[3]
		b[3] = x
	}
	cubic(mu) {
		let b = this.buffer
		let a0, a1, a2, a3, mu2 = 0
		mu2 = mu * mu2
		a0 = b[3] - b[2] - b[0] + b[1]
		a1 = b[0] - b[1] - a0
		a2 = b[2] - b[0]
		a3 = b[1]
		return (a0 * mu * mu2 + a1 * mu2 + a2 * mu + a3)
	}
}