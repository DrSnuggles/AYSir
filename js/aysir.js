/* AYSIR by DrSnuggles
	a ES6 module class for multiple Audioworklet players
	AY SIR !! RiP

	loader -> depacker -> FYMReader -> Pumper Worker -> AYUMI AudioWorklet
	|     MODULE        |        WORKER              |    AudioWorklet
*/

import {Visualizer} from '/visualizer/visualizer.min.js'
//import {Visualizer} from '/visualizer/visualizer_dev.js'

//
// Force SSL, else AudioWorklet wont work
//
if (location.protocol !== 'https:') location.replace(`https:${location.href.substring(location.protocol.length)}`)

function getUrlParameter(name) { // todo: i bet a dollar there are nicer ways to achieve this
	name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]')
	const regex = new RegExp('[\\?&]' + name + '=([^&#]*)')
	const results = regex.exec(location.search)
	return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '))
}
let engine = getUrlParameter('engine').toLowerCase()
const knownEngines = ['lunar', 'ayumi', 'gasman', 'vecx']
if (knownEngines.indexOf(engine) === -1) engine = knownEngines[0]

let isLoading = false, rAF, song, vis

//
// buffer fill worker
//
const worker = new Worker('./js/aysir.worker.js', {type: 'module'})
worker.onmessage = (e) => {
	switch (e.data.msg) {
		case 'songEnd':
			loadAndPlayNextSong()
			break
		case 'song':
			song = e.data.song
		infoTxt.innerText = song.author +' - '+ song.title + (song.comment ? ' ('+ song.comment  +')': '')
			// calc time
			const time = Math.ceil(((song.frameCount) ? song.frameCount : song.frames.length) / song.rate) // secs rounded up
			let mm = Math.floor(time/60)
			if (mm < 10) mm='0'+mm
			let ss = Math.floor(time - mm*60)
			if (ss < 10) ss='0'+ss
			songLen.innerText = mm+':'+ss
			break
		case 'progress':
			position.value = e.data.a
			break
		default:
			console.error('Unknown message from Worker:', e.data)
	}
}
function initWorker() {
	if (node.port){
		//console.log('want to transfer')
		worker.postMessage({dest: node.port}, [node.port])
	}
	worker.postMessage({msg:'init', a:{
		sampleRate: ctx.sampleRate,
	}})
}



//
// audio context
//
let ctx, node, gain, gainVal = 0.25
setEngine(engine)
function setGain(vol) {
	gainVal = vol
	gain.gain.value = vol
}
async function setEngine(eng) {
	// https://zgadzaj.com/development/javascript/how-to-change-url-query-parameter-with-javascript-only
	
	const qP = new URLSearchParams(window.location.search) // Construct URLSearchParams object instance from current URL querystring.
	qP.set('engine', eng) // Set new or modify existing parameter value. 
	//history.replaceState(null, null, '?'+qP.toString()) // Replace current querystring with the new one.
	history.pushState(null, null, '?'+qP.toString())
	
	for (let i = 0; i < EngineSel.options.length; i++) {
		if (EngineSel[i].value === eng) {
			EngineSel[i].selected = true
			break
		}
	}
	
	if (ctx) ctx.close()
	
	// now reinit the whole audio ctx incl. worklet
	ctx = new AudioContext(/*{sampleRate: 27344}*/) // 22050 is bit too low
	console.log(ctx)

	if (ctx.state == 'running') {
		audioModal.classList.add('fadeOut')
	}

	await ctx.audioWorklet.addModule(`./js/backend/${eng}.js`)
	node = new AudioWorkletNode(ctx, `${eng}-audio-processor`, {
		numberOfInputs: 0,
		numberOfOutputs: 2,
		outputChannelCount: [1, 1]
	})
	node.port.onmessage = (e) => console.log(e.data) // this direction is not used

	//node.connect(ctx.destination) // no gain in between this time
	// rewire with gain node for volume control
	if (!vis?.settings)
		vis = new Visualizer(node, myViz, {fps: 30, fftSize: 11})
	else
		vis.analyzer.setSource(node)

	node.disconnect(ctx.destination)
	gain = ctx.createGain()
	node.connect(gain)
	gain.connect(ctx.destination)
	setGain(gainVal)


	// single stereo analyzer vs 2 mono nodes or more general just how many nodes
	// rewire for analyzers (two) from worklet node, oops it's different, will keep my normal aproach here for reference, also had to change the backends
	/*
	console.log(node)
	//const source = ctx.createMediaElementSource(testAudio) // works
	const source = ctx.createGain()
	node.connect(source)
	const splitter = ctx.createChannelSplitter(2) // source.channelCount
	const left = ctx.createStereoPanner()
	const right = ctx.createStereoPanner()
	source.connect(splitter) // here i use node and not the biased gain
	splitter.connect(left, 0)
	splitter.connect(right, 1)
	left.pan.value = -1.0
	right.pan.value = 1.0
	*/
	/* in viz
	for (let i = 0, e = ctx.destination.channelCount; i < e; i++) { // all channels the ctx has
		analyserNodes[i] = ctx.createAnalyser()
		analyserNodes[i].fftSize = 2048 // default = 2048 // 2^5 .. 2^15 (32..32768)
		analyserNodes[i].minDecibels = -100 // default = -100
		analyserNodes[i].maxDecibels = -30 // default = -30
		analyserNodes[i].smoothingTimeConstant = 0.8 // default = 0.8
		// Todo: ^^ needs to be set by visualizers, or ???
		node.connect(analyserNodes[i], i, 0) // pick correct input channel
	}
	console.log(analyserNodes)
	function analLoop() {
		rAF = requestAnimationFrame(analLoop)  

		if (actViz === 0) return

		const data = []
		// TimeDomain or Frequency
		if (actViz == 1) {
			// freq (use binCount or fftSize/2)
			for (let i = 0; i < analyserNodes.length; i++) {
				data[i] = new Uint8Array(analyserNodes[i].frequencyBinCount)
				analyserNodes[i].getByteFrequencyData(data[i])
			}
		} else {
			// timedomain waveform, goniometer
			for (let i = 0; i < analyserNodes.length; i++) {
				data[i] = new Uint8Array(analyserNodes[i].fftSize)
				analyserNodes[i].getByteTimeDomainData(data[i])
			}
		}
		
		canvasWorker.postMessage({viz: actViz, data: data})


	if (rAF) {
		cancelAnimationFrame(rAF)
		rAF = null
	}

	rAF = requestAnimationFrame(analLoop)
	}
	*/

	sendAudioInfo()
	
	// stupid no audio till user interaction policy thingy
	function resume() {
	if (ctx.state !== 'running') {
		ctx.resume()
		audioModal.classList.add('fadeOut')
	}
	}
	addEventListener('keydown', resume)
	addEventListener('click', resume)
	addEventListener('touchstart', resume)
	
	initWorker()
	if (song) worker.postMessage({msg:'config'})

}
function sendAudioInfo() {
	return // todo
	canvasWorker.postMessage({audioInfo: {
		fftSize: analyserNodes[0].fftSize,
		minDB: analyserNodes[0].minDecibels,
		maxDB: analyserNodes[0].maxDecibels,
		smooth: analyserNodes[0].smoothingTimeConstant,
		sampleRate: ctx.sampleRate,
		channels: ctx.destination.channelCount,
	}})
}
function setPos(pos) { // todo: rethink this 0..1 float, could also be frame of frameCount
	//const jumpTo = Math.floor(((song.frames.length) ? song.frames.length : song.frameCount) * pos)
	const jumpTo = Math.floor(song.frameCount * pos)
	worker.postMessage({msg:'jump', a:jumpTo})
}

function setPan(pan) {
	worker.postMessage({msg:'pan', a:pan})
}

function loadAndPlayNextSong() {
	//currentSong = (currentSong + 1) % songs.length
	//playURL( songs[currentSong] )
	// changed to kkRows method
	songSel.worker.postMessage({msg:'getRandom', callback:'tblRandom'})
}
window.tblRandom = (r) => {
	const l = r.rng ? r.rng : r	// rng chosen or real click
	playURL( l[0].replace(/\&amp;/g,'&'), (l[1] === 'Radio') ? true : false)			// Berluskoni - Flimbos Quest
}
function playURL(url) {
	if (isLoading) return
	isLoading = true
	console.log('fetch', encodeURI(url))
	fetch( encodeURI(url))
	.then(r=>{
		if (r.ok) return r.arrayBuffer()
		throw 'oops, could not load song, i will try the next song'
	})
	.then(b=>new Uint8Array(b))
	.then(b=>{
		// check if we got stupid content
		// <!DOCTYPE
		//60, 33, 68, 79, 67, 84, 89, 80,
		// this means a URL encoding prob in CORS worker !! ToDo in other project, but should be handled
		if (b[0] === 60 && b[1] === 33 && b[2] === 68 && b[3] === 79) throw 'Got HTML content not a data buffer'
		//console.log('wanna post buf')
		worker.postMessage({msg:'buf', ext: url.substr(-3).toLowerCase(), buf:b})
		isLoading = false
	})
	.catch(e=>{
		console.warn(e)
		isLoading = false
		loadAndPlayNextSong()
	})
	
}

//
// handlers
// drop handler
//
function preventDefaults(e) {
	e.preventDefault()
}
function dropHandler(e) {
	console.log('dropHandler',e)
	let file = null
	if (e.dataTransfer.items) {
		for (let i = 0; i < e.dataTransfer.items.length; i++) {
			if (e.dataTransfer.items[i].kind === 'file') {
				file = e.dataTransfer.items[i].getAsFile()
				break
			}
		}
	} else {
		for (let i = 0; i < e.dataTransfer.files.length; i++) {
			file = e.dataTransfer.files[i]
			break
		}
	}

	if (file) {
		if (file.size <= 10 * 1024 * 1024) { // 10MB max
			const reader = new FileReader()
			console.log(file, reader)
			reader.readAsArrayBuffer(file)
			reader.onloadend = function() {
				//console.log(reader.result)
				const ext = file.name.substr(file.name.indexOf('.')+1).toLowerCase() // used at least twice todo !!
				worker.postMessage({msg:'buf', buf:new Uint8Array(reader.result), ext:ext})
			}
		} else {
			console.error('File too large (>10MB).')
		}
	}
}

const dropArea = window
// preventDefaults on all drag related events
const remHandler = ['drop', 'dragdrop', 'dragenter', 'dragleave', 'dragover']
remHandler.forEach((e) => {
	dropArea.addEventListener(e, preventDefaults, false)
})
// handler on drop
const addHandler = ['drop', 'dragdrop']
addHandler.forEach((e) => {
	dropArea.addEventListener(e, dropHandler, false)
})

//
// get some songs
//
let songs = [], data = []
/*
songs.push('./songs/nq - Hara mamba scene (2019).pt3')
songs.push('./songs/nq - Tom\'s diner (2021).pt3')
songs.push('./songs/Scalesmann - Misfire (2014) (Chaos Constructions 2014, 1).pt3')
data.push(['./songs/nq - Hara mamba scene (2019).pt3','nq','Hara mamba','PT3'])
data.push(['./songs/nq - Tom\'s diner (2021).pt3','nq','Toms Diner', 'PT3'])
data.push(['./songs/Scalesmann - Misfire (2014) (Chaos Constructions 2014, 1).pt3','scalesmann','Misfire','PT3'])
songs.push('./songs/Engrossing Moments DH2020.pt3')
data.push(['./songs/Engrossing Moments DH2020.pt3','','pt3.7','engross'])
songSel.setAttribute('data', JSON.stringify(data) )
loadAndPlayNextSong()
*/
//fillModland()
fillNK()
function fillNK() {
	console.time('process NK list')
	fetch('./lists/NK.json')
	.then(r => r.json())
	.then(j => {
		const k = j
		let l = 0
		const urlStart = './songs/NK/'
		for (let i = 0; i < k.length; i++) {
			let url = urlStart + k[i] +'.128'
			//url = url.replace(/ /g,'%20')
			songs.push(url)
			data.push( [url, 'unknown', k[i], 'BSC', 'Norbert Kehrer' ] )
			l++
		}
		console.timeEnd('process NK list')
		console.log('NK songlist contains: ', l)

		//
		// callback
		//
		//songSel.setAttribute('data', JSON.stringify(data) )
		//loadAndPlayNextSong()
		fillMmcm()
		
	})
	.catch(e=>console.error(e))
	
}
function fillMmcm() {
	console.time('process mmcm list')
	fetch('./lists/mmcm.json')
	.then(r => r.json())
	.then(j => {
		const k = Object.keys(j)
		let l = 0
		const urlStart = 'https://simpleproxy.drsnuggles.workers.dev?https://ym.mmcm.ru/chiptunes/'
		for (let i = 0; i < k.length; i++) {
			for (let e = 0; e < j[k[i]].length; e++) {
				let url = urlStart + k[i] +'/'+ j[k[i]][e]
				url = url.replace(/ /g,'%20')
				songs.push(url)
				data.push( [url, k[i], j[k[i]][e].substr(0, j[k[i]][e].lastIndexOf('.')), 'FYM', 'MccM' ] )
				l++
			}
		}
		console.timeEnd('process mmcm list')
		console.log('MmcM songlist contains: ', l)

		//
		// callback
		//
		fillModland()
		
	})
	.catch(e=>console.error(e))
	
}
function fillModland() {
	console.time('process modland list')
	fetch('./lists/modland.txt')
	.then(r => r.text())
	.then(t => t.split('\n'))
	.then(a => {
		let l = 0
		let lastAuthor = ''
		for (let i = 0; i < a.length; i++) {
			const entry = a[i].split('\t')[1]
			if (!entry) continue // skip blank lines (last)
			
			const tmp = entry.split('/')
			const format = tmp[0]
			const author = tmp[1]
			const title = tmp[tmp.length-1]
			const ext = title.substr(title.indexOf('.')).toLowerCase()
			if (['.ym','.vtx','.XXXpt3'].indexOf(ext) !== -1) { // ToDo: enable PT3
				const url = 'https://ftp.modland.com/pub/modules/' + entry
				const authorChange = (lastAuthor !== author)
				if (authorChange) {
					lastAuthor = author
				}

				songs.push(url)
				const ext = title.substr(title.lastIndexOf('.')+1).toUpperCase()
				data.push( [url, author, title.substr(0, title.lastIndexOf('.')), ext, 'Modland'] )
				l++
			}
		}

		songSel.setAttribute('data', JSON.stringify(data) )

		//songs = songs.map((a) => [Math.random(),a]).sort((a,b) => a[0]-b[0]).map((a) => a[1])

		console.timeEnd('process modland list')
		console.log('Modland songlist contains: ', l)

		//
		// start the show, emm audio
		//
		loadAndPlayNextSong()
		//toggleViz()

	})
	.catch(e=>console.error(e))
}

//
// analyzer settings
//
function changeFFT(val) {
	const x = Math.pow(2, val)
	for(let i = 0; i < vis.analyzer.analyserNodes.length; i++) {
		vis.analyzer.analyserNodes[i].fftSize = x
	}
	vis.analyzer.analyserNode.fftSize = x
	sendAudioInfo()
}
function changeMinDB(val) {
	for(let i = 0; i < vis.analyzer.analyserNodes.length; i++) {
		vis.analyzer.analyserNodes[i].minDecibels = val
	}
	vis.analyzer.analyserNode.minDecibels = val
	sendAudioInfo()
}
function changeMaxDB(val) {
	for(let i = 0; i < vis.analyzer.analyserNodes.length; i++) {
		vis.analyzer.analyserNodes[i].maxDecibels = val
	}
	vis.analyzer.analyserNode.maxDecibels = val
	sendAudioInfo()
}
function changeSmooth(val) {
	for(let i = 0; i < vis.analyzer.analyserNodes.length; i++) {
		vis.analyzer.analyserNodes[i].smoothingTimeConstant = val
	}
	vis.analyzer.analyserNode.smoothingTimeConstant = val
	sendAudioInfo()
}

//
// set globals for external (HTML/UI) use
//
window.AYSir = {
	loadAndPlayNextSong: loadAndPlayNextSong,
	playURL: (j) => {
		playURL( j[0] )
	},
	setGain: setGain,
	setEngine: setEngine,
	setPan: setPan,
	setPos: setPos,
	//toggleViz: toggleViz,

	changeFFT: changeFFT,
	changeMinDB: changeMinDB,
	changeMaxDB: changeMaxDB,
	changeSmooth: changeSmooth,
}


//
// Polyfills
//
/* getFloatTimeDomainData polyfill for Safari
if (global.AnalyserNode && !global.AnalyserNode.prototype.getFloatTimeDomainData) {
	var uint8 = new Uint8Array(32768);
	global.AnalyserNode.prototype.getFloatTimeDomainData = function(array) {
		this.getByteTimeDomainData(uint8);
		for (var i = 0, imax = array.length; i < imax; i++) {
			array[i] = (uint8[i] - 128) * 0.0078125;
		}
	};
}
*/