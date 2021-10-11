/*
  Worker vor OffscreenCanvas
*/

let canv, ctx, width, height, dataL, dataR

onmessage = function(e) {
  // most on top
  if (e.data.dataL) {
    // draw
    dataL = e.data.dataL
    dataR = e.data.dataR

    clearGoniometer()
    drawBGlines()
    drawGoniometer()
    
    return
  }
  // init = transfer of offscreen canvas
  if (e.data.canvas) {
    canv = e.data.canvas
    width = canv.width
    height = canv.height
    ctx = canv.getContext('2d')

    return
  }
  // still here ?
  console.error('Unknown message:', e.data)
}

function clearGoniometer() {
  // clear/fade out old
  ctx.fillStyle = 'rgba(0, 0, 0, 255)'
  ctx.fillRect(0, 0, width, height)
}

function drawBGlines() {
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(30, 200, 10, 255)'
  ctx.beginPath()

  // x - axis
  ctx.moveTo(0, height/2)
  ctx.lineTo(width, height/2)

  // y - axis
  ctx.moveTo(width/2, 0)
  ctx.lineTo(width/2, height)

  // l - axis
  ctx.moveTo(0, 0)
  ctx.lineTo(width, height)

  // r - axis
  ctx.moveTo(width, 0)
  ctx.lineTo(0, height)

  // circles/ellipses
  // 50%
  ctx.moveTo(width/2 + width/2 /2, height/2)
  ctx.ellipse(width/2, height/2, width/2 /2, height/2 /2, 0, 0, 2*Math.PI)

  // 75%
  ctx.moveTo(width/2 + width/2 /(4/3), height/2)
  ctx.ellipse(width/2, height/2, width/2 /(4/3), height/2 /(4/3), 0, 0, 2*Math.PI)

  // 100%
  ctx.moveTo(width/2 + width/2, height/2)
  ctx.ellipse(width/2, height/2, width/2, height/2, 0, 0, 2*Math.PI)

  ctx.stroke() // finally draw
}

function drawGoniometer() {
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(30, 200, 10, 255)'
  ctx.beginPath()

  let rotated

  // move to start point
  rotated = rotate45deg(dataR[0], dataL[0]);  // Right channel is mapped to x axis
  ctx.moveTo(rotated.x * width + width/2, rotated.y* height + height/2)

  // draw line
  for (let i = 1; i < dataL.length; i++) {
   rotated = rotate45deg(dataR[i], dataL[i])
   ctx.lineTo(rotated.x * width + width/2, rotated.y* height + height/2)
  }

  ctx.stroke()
}

// Helpers
function rotate45deg(x, y) {
  const tmp = cartesian2polar(x, y)
  tmp.angle -= 0.78539816 // Rotate coordinate by 45 degrees
  const tmp2 = polar2cartesian(tmp.radius, tmp.angle)
  return {x:tmp2.x, y:tmp2.y}
}
function cartesian2polar(x, y) {
  // Convert cartesian to polar coordinate
  const radius = Math.sqrt((x * x) + (y * y))
  const angle = Math.atan2(y,x) // atan2 gives full circle
  return {radius:radius, angle:angle}
}
function polar2cartesian(radius, angle) {
  // Convert polar coordinate to cartesian coordinate
  const x = radius * Math.sin(angle)
  const y = radius * Math.cos(angle)
  return {x:x, y:y}
}

