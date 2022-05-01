/*
	Based on: https://github.com/mmontag/chip-player-js/blob/master/src/Spectrogram.js
	Reworked by: DrSnuggles (no deps, class in offscreen canvas worker...)
*/

export class Spectrogram {
	constructor(ctx,mode = 'LOG', weighting = 'A') {
		this.ctx = ctx
		this.width = ctx.canvas.width
		this.height = ctx.canvas.height
		this.colorMap = this.makeColorMap([
			'#000000',
			'#0000a0',
			'#6000a0',
			'#962761',
			'#dd1440',
			'#f0b000',
			'#ffffa0',
			'#ffffff',
		])
		this.tempCanvas = new OffscreenCanvas(this.width, this.height)// for gradient ?? needed ??
		this.tempCtx = this.tempCanvas.getContext('2d', {alpha: false}) // for repeated copy
		this.MODE = mode // LINEAR, LOG, CONSTANT_Q
		this.WEIGHTING = weighting // NONE, A
		
		this.hCoeff = this.height*0.2 // top 20% are used for spec, lower 80% for history
		this.bins = 1024 // overwritten after audio init
		this.nyquist = 48000 / 2 // half of sampleRate
		this.lastData = []

		// A Weighting
		const freqTable = this.makeBinFreqs()
		this._aWeightingLUT = freqTable.map(f => 0.5 + 0.5 * this._getAWeighting(f))
	}
	clear() {
		// clear
		const ctx = this.ctx
		ctx.fillStyle = 'rgb(0, 0, 0)'
		ctx.fillRect(0, 0, this.width, this.hCoeff)
	}
	drawBG() {}
	drawFG(dat) {
		const ctx = this.ctx
		const width = this.width
		const hCoeff = this.hCoeff
		const bins = this.bins

		const data = dat[0]

		const specSpeed = 2
		//const specCtx = this.specCtx;
	
		//const dataHeap = new Float32Array(this.lib.HEAPF32.buffer, this.dataPtr, this.cqtSize);
		//const bins = this.fftSize / 2
		let isRepeated = false
		const scaleX = width / bins
	
		if (this.MODE === 'LINEAR') {
			//analyserNode.getByteFrequencyData(data);
			//data = new Uint8Array(data[0])	// convert float to byte
			isRepeated = this.isRepeatedFrequencyData(data)
			//console.log(data[0])
			for (let i = 0; i < bins; i++) {
				//console.log(data[x], getColor(data[x]))
				const style = colorMap[data[i]]
				const h = ((WEIGHTING === 'A') ? _aWeightingLUT[i]/1.4 : 1) * data[i]/256 * hCoeff | 0
				const x = i*scaleX
				ctx.fillStyle = style
				ctx.fillRect(x, hCoeff - h, scaleX, h)
				tempCtx.fillStyle = style
				tempCtx.fillRect(x, 0, scaleX, specSpeed)
			}
		}
		else if (this.MODE === 'LOG') {
			//analyserNode.getByteFrequencyData(data);
			//data = new Uint8Array(data[0]) // convert float to byte
			isRepeated = this.isRepeatedFrequencyData(data)
			const logmax = Math.log(bins)
			for (let i = 0; i < bins; i++) {
				const x =        (Math.log(i + 1) / logmax) * width | 0
				const binWidth = (Math.log(i + 2) / logmax) * width - x | 0
				const h =        ((this.WEIGHTING === 'A') ? this._aWeightingLUT[i]/1.4 : 1) * data[i]/256 * hCoeff | 0
				const style =    this.colorMap[data[i] || 0]
				ctx.fillStyle = style
				ctx.fillRect(x, hCoeff - h, binWidth, h)
				this.tempCtx.fillStyle = style
				this.tempCtx.fillRect(x, 0, binWidth, specSpeed)
			}
		} else if (MODE === 'CONSTANT_Q') {
			// not sure if i want webassembly code here
			//analyserNode.getFloatTimeDomainData(dataHeap)
			if (!dataHeap.every(n => n === 0)) {
				this.lib._cqt_calc(this.dataPtr, this.dataPtr)
				this.lib._cqt_render_line(this.dataPtr)
				// copy output to canvas
				for (let x = 0; x < canvasWidth; x++) {
					const weighting = WEIGHTING === 'A' ? _aWeightingLUT[x] : 1
					const val = 255 * weighting * dataHeap[x] | 0 //this.lib.getValue(this.cqtOutput + x * 4, 'float') | 0;
					const h = val * hCoeff | 0
					const style = getColor(val)
					ctx.fillStyle = style
					ctx.fillRect(x, fqHeight - h, 1, h)
					this.tempCtx.fillStyle = style
					this.tempCtx.fillRect(x, 0, 1, specSpeed)
				}
			}
		}
	
		if (!isRepeated) {
			// tempCtx.drawImage(this.specCanvas, 0, 0);
			// translate the transformation matrix. subsequent draws happen in this frame
			this.tempCtx.translate(0, specSpeed)
			// draw the copied image
			this.tempCtx.drawImage(this.tempCanvas, 0, 0)
			// reset the transformation matrix
			this.tempCtx.setTransform(1, 0, 0, 1, 0, 0)
			
			ctx.drawImage(this.tempCanvas, 0, hCoeff)
		}
	
	}
	setAudio(info) {
		this.bins = info.fftSize/2
		this.nyquist = info.sampleRate/2
		this.channels = info.channels

		// A Weighting
		const freqTable = this.makeBinFreqs()
		this._aWeightingLUT = freqTable.map(f => 0.5 + 0.5 * this._getAWeighting(f))
	}

	// Helpers
	makeColorMap(gradientColors) {
		/* todo: should also be called on resize
			dep less solution is canvas.createLinearGradient and add gradient.addColorStop
			return new chroma.scale(arr).domain([0, 255])
			https://stackoverflow.com/questions/30143082/how-to-get-color-value-from-gradient-by-percentage-with-javascript
		*/
		const steps = 256
		const oCanv = new OffscreenCanvas(256, 1)
		//offscreen.width = width
		//offscreen.height = height
		const oCtx = oCanv.getContext('2d', {alpha: false})
		
		// Gradient
		const gradient = oCtx.createLinearGradient(0, 0, steps, 0) // x0, y0, x1, y1
		
		const step = 1 / (gradientColors.length - 1) // need to validate at least two colors in gradientColors
		let val = 0
		gradientColors.forEach(color => {
			gradient.addColorStop(val, color)
			val += step
		})
	
		// Fill with gradient
		oCtx.fillStyle = gradient
		oCtx.fillRect(0, 0, steps, 1)
	
		let ret = []
		for (let i = 0; i < steps; i++) {
			ret[i] = getColor(i)
		}
		return ret
	
		// helper
		function getColor(ind) {
			const rgba = oCtx.getImageData(ind, 0, 1, 1).data // x, y, width, height
			return `rgb(${ rgba[0] }, ${ rgba[1] }, ${ rgba[2] })`
		}
	
	}
	_getAWeighting(f) {
		const f2 = f*f
		return 1.5 * 1.2588966 * 148840000 * f2*f2 / ((f2 + 424.36) * Math.sqrt((f2 + 11599.29) * (f2 + 544496.41)) * (f2 + 148840000))
	}
	isRepeatedFrequencyData(data) {
		// Jitter correction: ignore repeated frequency data in spectrogram
		let isRepeated = true
		for (let i = 0; i < this.bins; i+=16) { // checks every 16th val
			if (data[i] !== this.lastData[i]) {
				isRepeated = false
			}
			this.lastData[i] = data[i]
		}
		return isRepeated
	}
	cqt_bin_to_freq(bin, basefreq, endfreq) {
		const log_base = Math.log(basefreq)
		const log_end = Math.log(endfreq)
		return Math.exp(log_base + (bin + 0.5) * (log_end - log_base) * (1.0 / width))
	}
	makeBinFreqs() {
		// web audio analysers are linear from 0 to nyquist (thats half smaple rate)
		const ret = []
		for (let i = 0; i < this.bins; i++) {
			ret[i] =  i/this.bins * this.nyquist
		}
		return ret
	}
}