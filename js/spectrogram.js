/*
	Worker for OffscreenCanvas
	Based on: https://github.com/mmontag/chip-player-js/blob/master/src/Spectrogram.js
	Reworked by: DrSnuggles (no deps, worker, ...)
*/

let canv, ctx, width, height, data
//let oCtx // for gradient picker (colormap)
let colorMap = []
let tempCanvas, tempCtx // for repeated copy

const MODE = 'LOG' // LINEAR, LOG, CONSTANT_Q
const WEIGHTING = 'A' // NONE, A

let hCoeff // top 20% are used for spec, lower 80% for history
let bins = 1024 // overwritten after audio init
let nyquist = 48000 / 2
let _aWeightingLUT
let lastData

onmessage = function(e) {
  // most on top
  if (e.data.data) {
    // draw
    data = e.data.data[0]

		clear()
    drawBG()
		drawFG()
    
    return
  }
  // 1st init = transfer of offscreen canvas
  if (e.data.canvas) {
    canv = e.data.canvas
    width = canv.width
    height = canv.height
    ctx = canv.getContext('2d', {alpha: false})

    return
  }
  // 2nd init = after analyzer setup
  if (e.data.fftSize) {
		bins = e.data.fftSize/2
		nyquist = e.data.sampleRate/2
		init()

    return
  }

	/*
	setPaused(paused) {
    if (this.paused && !paused) {
      requestAnimationFrame(this.updateFrame);
    }
    this.paused = paused;
  }
  setMode(mode) {
    this.mode = mode;
    if (mode === MODE_CONSTANT_Q) {
      this.analyserNode.fftSize = this.cqtSize || 2048;
    } else {
      this.analyserNode.fftSize = this.fftSize;
    }
  }
  setFFTSize(size) {
    this.fftSize = size;
    this.analyserNode.fftSize = size;
  }
	setWeighting(mode) {
    this.weighting = mode;
  }
  setSpeed(speed) {
    this.specSpeed = speed;
  }
	*/

  // still here ?
  console.error('Unknown message:', e.data)
}

function init() {
	colorMap = makeColorMap([
		'#000000',
		'#0000a0',
		'#6000a0',
		'#962761',
		'#dd1440',
		'#f0b000',
		'#ffffa0',
		'#ffffff',
	])
	//console.log(colorMap)

	tempCanvas = new OffscreenCanvas(width, height)
	tempCtx = tempCanvas.getContext('2d', {alpha: false})

	hCoeff = height*0.2

	// Constant Q setup
	const db = 32
	const supersample = 0
	//const cqtBins = canv.width
	//                MIDI note  16 ==   20.60 hz
	// Piano key  1 = MIDI note  21 ==   27.50 hz
	// Piano key 88 = MIDI note 108 == 4186.01 hz
	//                MIDI note 127 == 12543.8 hz
	const fMin = 25.95
	const fMax = 4504.0
	lastData = []

	// todo:
	// cqt_init
	//if (!cqtSize) {
	//	console.error('Error initializing constant Q transform. Constant Q will be disabled.')
	//} else {
		// length = fftSize / 2
		//const cqtFreqs = Array(1024).fill().map((_, i) => cqt_bin_to_freq(i, fMin, fMax))
		//_aWeightingLUT = cqtFreqs.map(f => 0.5 + 0.5 * _getAWeighting(f))
		const freqTable = makeBinFreqs()
		_aWeightingLUT = freqTable.map(f => 0.5 + 0.5 * _getAWeighting(f))

		console.log(freqTable)
		console.log(_aWeightingLUT)
		//}

}
function clear() {
  // clear/fade out old
  //ctx.fillStyle = 'rgba(0, 0, 0, 255)'
	ctx.fillStyle = 'rgb(0, 0, 0)'
  ctx.fillRect(0, 0, width, hCoeff)
}
function drawBG() {}
function drawFG() {
	const specSpeed = 2
	//const specCtx = this.specCtx;

	//const dataHeap = new Float32Array(this.lib.HEAPF32.buffer, this.dataPtr, this.cqtSize);
	//const bins = this.fftSize / 2
	let isRepeated = false
	const scaleX = width / bins

	if (MODE === 'LINEAR') {
		//analyserNode.getByteFrequencyData(data);
		//data = new Uint8Array(data[0])	// convert float to byte
		isRepeated = isRepeatedFrequencyData(data)
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
	else if (MODE === 'LOG') {
		//analyserNode.getByteFrequencyData(data);
		//data = new Uint8Array(data[0]) // convert float to byte
		isRepeated = isRepeatedFrequencyData(data)
		const logmax = Math.log(bins)
		for (let i = 0; i < bins; i++) {
			const x =        (Math.log(i + 1) / logmax) * width | 0
			const binWidth = (Math.log(i + 2) / logmax) * width - x | 0
			const h =        ((WEIGHTING === 'A') ? _aWeightingLUT[i]/1.4 : 1) * data[i]/256 * hCoeff | 0
			const style =    colorMap[data[i] || 0]
			ctx.fillStyle = style
			ctx.fillRect(x, hCoeff - h, binWidth, h)
			tempCtx.fillStyle = style
			tempCtx.fillRect(x, 0, binWidth, specSpeed)
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
				tempCtx.fillStyle = style
				tempCtx.fillRect(x, 0, 1, specSpeed)
			}
		}
	}

	if (!isRepeated) {
		// tempCtx.drawImage(this.specCanvas, 0, 0);
		// translate the transformation matrix. subsequent draws happen in this frame
		tempCtx.translate(0, specSpeed)
		// draw the copied image
		tempCtx.drawImage(tempCanvas, 0, 0)
		// reset the transformation matrix
		tempCtx.setTransform(1, 0, 0, 1, 0, 0)
		
		ctx.drawImage(tempCanvas, 0, hCoeff)
	}

}

// Helpers
function _getAWeighting(f) {
	const f2 = f*f
	return 1.5 * 1.2588966 * 148840000 * f2*f2 / ((f2 + 424.36) * Math.sqrt((f2 + 11599.29) * (f2 + 544496.41)) * (f2 + 148840000))
}
function makeColorMap(gradientColors) {
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
function isRepeatedFrequencyData(data) {
	// Jitter correction: ignore repeated frequency data in spectrogram
	let isRepeated = true
	for (let i = 0; i < bins; i+=16) { // checks every 16th val
		if (data[i] !== lastData[i]) {
			isRepeated = false
		}
		lastData[i] = data[i]
	}
	return isRepeated
}
function cqt_bin_to_freq(bin, basefreq, endfreq) {
  const log_base = Math.log(basefreq)
  const log_end = Math.log(endfreq)
  return Math.exp(log_base + (bin + 0.5) * (log_end - log_base) * (1.0 / width))
}
function makeBinFreqs() {
	// web audio analysers are linear from 0 to nyquist (thats half smaple rate)
	const ret = []
	for (let i = 0; i < bins; i++) {
		ret[i] =  i/bins * nyquist
	}
	return ret
}
