/*
	Worker for OffscreenCanvas
*/
import {Goniometer} from './visualizer/goniometer.js'
import {Spectogram} from './visualizer/spectogram.js'

let viz = []

onmessage = function(e) {
	// most used on top
	if (e.data.data) {
		viz[e.data.viz-1].clear()
		viz[e.data.viz-1].drawBG()
		viz[e.data.viz-1].drawFG(e.data.data)

		return
	}

	// 1st init = transfer of offscreen canvas
	if (e.data.canvas) {
		const canv = e.data.canvas
		viz.push(new Goniometer(canv.getContext('2d'), canv.width, canv.height))
		viz.push(new Spectogram(canv.getContext('2d', {alpha: false}), canv.width, canv.height))
		return
	}

	// 2nd init = after analyzer setup
	if (e.data.fftSize) {
		for (let i = 0; i < viz.length; i++) {
			viz[i].setAudio(e.data.fftSize, e.data.sampleRate)
		}
		return
	}

	// still here ?
	console.error('Unknown message:', e.data)
}