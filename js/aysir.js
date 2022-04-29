/* AYSIR by DrSnuggles
	a ES6 module class ayumi based Audioworklet player
	AY SIR !! RiP

	loader -> depacker -> FYMReader -> Pumper Worker -> AYUMI AudioWorklet
	|     MODULE        |        WORKER              |    AudioWorklet

*/

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
if (engine == '') engine = 'ayumi'

let currentSong = 0, song, isLoading = false, rAF

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
// Canvas offscreen worker
//
// ToDo: initiate on open and different types...
const offscreen = document.querySelector('#myViz').transferControlToOffscreen()
//const canvasWorker = new Worker('./js/goniometer.js', {type: 'module'})
//const canvasWorker = new Worker('./js/spectogram.js', {type: 'module'})
const canvasWorker = new Worker('./js/canvas.worker.js', {type: 'module'})
canvasWorker.postMessage({ canvas: offscreen }, [offscreen]) // its nicer to pack the transfered objects into a new one

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
	const analyserNodes = []
	for (let i = 0, e = ctx.destination.channelCount; i < e; i++) { // all channels the ctx has
		analyserNodes[i] = ctx.createAnalyser()
		analyserNodes[i].fftSize = 2048 // 2^5 .. 2^15 (32..32768) default 2048
		node.connect(analyserNodes[i], i, 0) // pick correct input channel
	}
	function analLoop() {
		rAF = requestAnimationFrame(analLoop)  

		const data = []
		// TimeDomain or Frequency
		if (actViz == 1) {
			for (let i = 0; i < analyserNodes.length; i++) {
				data[i] = new Float32Array(analyserNodes[i].frequencyBinCount)
				analyserNodes[i].getFloatTimeDomainData(data[i])
			}
		} else if (actViz == 2) {
			for (let i = 0; i < analyserNodes.length; i++) {
				data[i] = new Uint8Array(analyserNodes[i].frequencyBinCount)
				analyserNodes[i].getByteFrequencyData(data[i])
			}
		}

		if (actViz !== 0) canvasWorker.postMessage({viz: actViz, data: data})
	}

	if (rAF) {
		cancelAnimationFrame(rAF)
		rAF = null
	}
	console.log(analyserNodes[0])
	canvasWorker.postMessage({
		fftSize: analyserNodes[0].fftSize,
		minDB: analyserNodes[0].minDecibels,
		maxDB: analyserNodes[0].maxDecibels,
		smooth: analyserNodes[0].smoothingTimeConstant,
		sampleRate: ctx.sampleRate,
		channels: ctx.destination.channelCount,
	})

	rAF = requestAnimationFrame(analLoop)
	
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
function setPos(pos) { // todo: rethink this 0..1 float, could also be frame of frameCount
	
	const jumpTo = Math.floor(((song.frames.length) ? song.frames.length : song.frameCount) * pos)
	worker.postMessage({msg:'jump', a:jumpTo})
}

function loadAndPlayNextSong() {
	currentSong = (currentSong + 1) % songs.length
	playURL( songs[currentSong] )
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
let songs = []
fillMmcm(fillModland)

function fillMmcm(cb) {
	console.time('process mmcm list')
	fetch('mmcm.json')
	.then(r => r.json())
	.then(j => {
		const k = Object.keys(j)
		const data = []
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
		cb(data)
		
	})
	.catch(e=>console.error(e))
	
}

function fillModland(data) {
	console.time('process modland list')
	fetch('modland.txt')
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
			if (['.ym','.vtx'].indexOf(ext) !== -1) {
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

		songs = songs.map((a) => [Math.random(),a]).sort((a,b) => a[0]-b[0]).map((a) => a[1])

		console.timeEnd('process modland list')
		console.log('Modland songlist contains: ', l)

		//
		// start the show, emm audio
		//
		loadAndPlayNextSong()

	})
	.catch(e=>console.error(e))
	
}
let actViz = 0 // 0 = off, 1 = Goniometer, 2 = Spectogram
function toggleViz() {
	actViz++
	if (actViz > 2) actViz = 0
	if (actViz === 0) myViz.classList.remove('fadeIn')
	if (actViz > 0) myViz.classList.add('fadeIn')
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
	setPos: setPos,
	toggleViz: toggleViz,
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
