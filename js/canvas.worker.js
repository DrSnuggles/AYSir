/*
	Worker for OffscreenCanvas
*/
import {Waveform} from './visualizer/waveform.js'
import {Spectrogram} from './visualizer/spectogram.js'
import {Goniometer} from './visualizer/goniometer.js'

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
		const tmp = e.data.canvas.getContext('2d')
		viz.push(new Spectrogram(tmp))
		viz.push(new Waveform(tmp))
		viz.push(new Goniometer(tmp))
		return
	}

	// 2nd init = after analyzer setup
	if (e.data.audioInfo) {
		for (let i = 0; i < viz.length; i++) {
			viz[i].setAudio(e.data.audioInfo)
		}
		return
	}

	// still here ?
	console.error('Unknown message:', e.data)
}