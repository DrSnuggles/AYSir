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

let currentSong = 0, song, isLoading = false

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
      //console.log(song)
      trackName.innerText = song.title
      authorName.innerText = song.author
      commentName.innerText = song.comment ? song.comment : ''
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
    worker.postMessage(node.port, [node.port])
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
  const anaL = ctx.createAnalyser()
  const anaR = ctx.createAnalyser()
  node.connect(anaL, 0, 0)
  node.connect(anaR, 1, 0)
  function analLoop() {
    requestAnimationFrame(analLoop)  
    const dataL = new Float32Array(anaL.frequencyBinCount)
    const dataR = new Float32Array(anaR.frequencyBinCount)
    anaL.getFloatTimeDomainData(dataL)
    anaR.getFloatTimeDomainData(dataR)
    //if (dataR && (dataL[0] !== dataR[0])) console.log(dataL[0], dataR[0]) // todo: check why right[n] == 0
    // here i have to set the gl vars
    //gl.uniform2f(analData, dataL, dataR)
  }
  requestAnimationFrame(analLoop)
  
  // stupid no audio till user interaction policy thingy
  function resume(){if (ctx.state !== 'running') ctx.resume()}
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
// ES6 shuffle: https://gist.github.com/guilhermepontes/17ae0cc71fa2b13ea8c20c94c5c35dc4#gistcomment-2271465
//let songs = [/*'songs/FYM/01_scalesmannmisfire.fym','songs/VTX/Gasman - Delta (2001).vtx','songs/VTX/JeRrS - Ostrowok (2006).vtx','songs/PSG/n1k-o, TmK - lost madness (2018) (DiHalt Lite 2018, 2).psg','songs/PSG/TmK - Some Small CompoFiller (2017) (Chaos Constructions 2017, 7).psg','songs/AY/COMMANDO.ay','songs/FYM/0ffsprin.fym','songs/nq - Hara mamba scene (2019).pt3','songs/YM/delta.ym'*/]
//songs = songs.map((a) => [Math.random(),a]).sort((a,b) => a[0]-b[0]).map((a) => a[1])

//
// own FYM ch6 list
// songs/FYM/6ch
// todo: add 6ch support
//
/*
const fym6ch = ['Alone Coder/gostiits','Black Fox/autumn','Ch41ns4w/afrox','Ch41ns4w/chebo','Ch41ns4w/dot','Ch41ns4w/drwilly','Ch41ns4w/phantasy','Ch41ns4w/ssss','Ch41ns4w/test2_2','Ch41ns4w/wannaf','Ch41ns4w/zalzachipi_1','Darkman007/technodrive','Darkman007/turbo','Dj Denson/d-omen','Dj Denson/pinkvis','Factor6/factor6 - cover of _hung up_ by madonna (2xay acb)','John/webberts','Karbofos/bananacucumber','Karbofos/dncdick','Karbofos/funkyenvelopes','Karbofos/goddy','Karbofos/insane','Karbofos/kk','Karbofos/krwrk','Karbofos/lgwbyb','Karbofos/minik','Karbofos/nm','Karbofos/nopower2','Karbofos/over','Karbofos/raketa','Karbofos/s2a','Karbofos/trotil','Karbofos/turbodance','Nik-O/kaukas','Nik-O/qbical','Riskej/moveur','Riskej/p_apostl','Riskej/sayyeahi','Scalesmann/onestp','Scalesmann/panic','Scalesmann/zaris','Shiru Otaku/ballquest1','Shiru Otaku/ballquest2','Shiru Otaku/ballquest3','Shiru Otaku/ballquest4','Shiru Otaku/ballquest5','Shiru Otaku/ballquest6','Shiru Otaku/ballquest8','Shiru Otaku/kirby_ts','Shiru Otaku/smr_ents','Shiru Otaku/smvenuts','Splinter/crazzyhouse','Splinter/domen','Splinter/illberemember','Splinter/ineedrest','Splinter/mermaid','Splinter/night','Splinter/nowtrance','Splinter/pinkvision','Splinter/pulsar','Splinter/stars','Splinter/wind','Splinter/wwf','Voxel/long_day','X-agon/x-agon_of_phantasy-breath-of-air-6chan-mod']
let html = []
html.push('<optgroup label="6ch FYM">')
fym6ch.forEach(e => {
  html.push(`<option value="FYM/6ch/${e}.fym">${e}</option>`)
  //songs.push(`songs/FYM/6ch/${e}.fym`) // not working yet
})
html.push('</optgroup')
songSel.insertAdjacentHTML('beforeEnd',html.join(''))
*/

console.time('process modland list')
fetch('allmods.txt')
.then(r => r.text())
.then(t => t.split('\n'))
.then(a => {
  let html = []
  for (let i = 0; i < a.length; i++) {
    const entry = a[i].split('\t')[1]
    if (!entry) continue // skip blank lines (last)
    
    const tmp = entry.split('/')
    const format = tmp[0]
    const author = tmp[1]
    const title = tmp[tmp.length-1]
    const ext = title.substr(title.indexOf('.')).toLowerCase()
    if (['.psg','.ym','.vtx','.fym'].indexOf(ext) !== -1) {
      let url = 'https://ftp.modland.com/pub/modules/' + entry
      html.push(`<option value="${url}">${author} ${title}</option>`)
      songs.push(url)
    }
  }
  //console.log(a)
  songSel.insertAdjacentHTML('beforeEnd',html.join(''))
  songSel.onclick = function(ev) {
    ev.preventDefault()
  }
  /*
  songSel.onchange = function(ev) {
    playURL(`${songSel.value}`)
  }
  */
  songs = songs.map((a) => [Math.random(),a]).sort((a,b) => a[0]-b[0]).map((a) => a[1])
  console.timeEnd('process modland list')
  console.log('Songlist contains: ', songs.length)

  //
  // start the show, emm audio
  //
  loadAndPlayNextSong()
  
})
.catch(e=>console.error(e))

//
// set globals for external (HTML/UI) use
//
window.AYSir = {
  loadAndPlayNextSong: loadAndPlayNextSong,
  playURL: playURL,
  setGain: setGain,
  setEngine: setEngine,
  setPos: setPos,
}