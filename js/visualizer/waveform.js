/*
	Waveform by DrSnuggles
	Idea: split height by channel amount and draw for each channel
*/

export class Waveform {
	constructor(ctx) {
		this.ctx = ctx
		this.width = ctx.canvas.width
		this.height = ctx.canvas.height
		this.strokeBG = 'rgba(0, 100, 0, 255)'
		this.strokeFG = 'rgba(0, 255, 0, 255)'
	}
	clear() {
		const ctx = this.ctx
		ctx.fillStyle = 'rgba(0, 0, 0, 255)'
		ctx.fillRect(0, 0, this.width, this.height)
	}
	drawBG() {
		const ctx = this.ctx
		const width = this.width
		const height = this.height

		ctx.lineWidth = 1
		ctx.strokeStyle = this.strokeBG
		
		for (let i = 0, e = this.channels; i < e; i++) {
			// x axis of each channel
			ctx.beginPath()
			ctx.setLineDash([15, 15]) // dashed line
			ctx.moveTo(0, (i+.5)*height/e)
			ctx.lineTo(width, (i+.5)*height/e)
			ctx.stroke()

			// line between channels
			ctx.beginPath()
			ctx.lineWidth = 2
			ctx.setLineDash([]) // solid line
			ctx.moveTo(0, i*height/e)
			ctx.lineTo(width, i*height/e)
			ctx.stroke()
		}

	}
	drawFG(data) {
		const ctx = this.ctx
		const width = this.width
		const height = this.height
		
		ctx.lineWidth = 2
		ctx.strokeStyle = this.strokeFG
		ctx.beginPath()
		
		// channels
		for (let ch = 0, e = data.length; ch < e; ch++) {
			let amp// = data[ch][i]
			let pos = .5*this.chHigh
			ctx.moveTo(0, pos)
			for (let i = 0, ee = data[ch].length; i < ee; i++) {
				amp = (data[ch][i]-128) / 128
				pos = (ch+.5)*this.chHigh + amp*this.ampHigh
				ctx.lineTo(i*this.width/ee, pos)
			}
			ctx.lineTo(width, pos)
		}
		
		ctx.stroke()
	}
	setAudio(audioInfo) {
		this.channels = audioInfo.channels

		// just calc once and use often
		this.chHigh = this.height / audioInfo.channels  
		this.ampHigh = this.chHigh / 2
	}
}