/* AY-3-8912 sound chip emulation
	from sc68 by Benjamin Gerard / https://github.com/hatari/hatari/blob/master/src/sound.c
	Table of unsigned 5 bit D/A output level for 1 channel as measured on a real ST (expanded from 4 bits to 5 bits)
	Vol 0 should be 310 when measuread as a voltage, but we set it to 0 in order to have a volume=0 matching
	the 0 level of a 16 bits unsigned sample (no sound output)
*/

class Gasman extends AudioWorkletProcessor {

  VOLUME_LEVELS_YM = [
    0/0x2fffd /*310*/,  369/0x2fffd,  438/0x2fffd,  521/0x2fffd,  619/0x2fffd,  735/0x2fffd,  874/0x2fffd, 1039/0x2fffd,
    1234/0x2fffd, 1467/0x2fffd, 1744/0x2fffd, 2072/0x2fffd, 2463/0x2fffd, 2927/0x2fffd, 3479/0x2fffd, 4135/0x2fffd,
    4914/0x2fffd, 5841/0x2fffd, 6942/0x2fffd, 8250/0x2fffd, 9806/0x2fffd,11654/0x2fffd,13851/0x2fffd,16462/0x2fffd,
    19565/0x2fffd,23253/0x2fffd,27636/0x2fffd,32845/0x2fffd,39037/0x2fffd,46395/0x2fffd,55141/0x2fffd,65535/0x2fffd
  ]
	/* the AY volume table has double entries to halve the envelope speed, see cyclesPerSampleEnv below */
	VOLUME_LEVELS_AY = [
		0.000000, 0.000000, 0.004583, 0.004583, 0.006821, 0.006821, 0.009684, 0.009684,
		0.014114, 0.014114, 0.020614, 0.020614, 0.028239, 0.028239, 0.045633, 0.045633,
		0.056376, 0.056376, 0.088220, 0.088220, 0.117568, 0.117568, 0.149977, 0.149977,
		0.190123, 0.190123, 0.229088, 0.229088, 0.282717, 0.282717, 0.333324, 0.333324
	]
	STEREO_MODES = {
		'ABC': [0.25, 0.5, 0.75],
		'ACB': [0.25, 0.75, 0.5],
		'BAC': [0.5, 0.25, 0.75],
		'BCA': [0.75, 0.25, 0.5],
		'CAB': [0.5, 0.75, 0.25],
		'CBA': [0.75, 0.5, 0.25],
    'MONO': [0.5, 0.5, 0.5]
	}
  
  constructor() {
    super()
    this.port.onmessage = this.handleMessage_.bind(this)

    this.registers = new Uint8Array(14)
  	this.toneGeneratorAPhase = 0
  	this.toneGeneratorAPeriod = 8
  	this.toneGeneratorACounter = 0

  	this.toneGeneratorBPhase = 0
  	this.toneGeneratorBPeriod = 8
  	this.toneGeneratorBCounter = 0

  	this.toneGeneratorCPhase = 0
  	this.toneGeneratorCPeriod = 8
  	this.toneGeneratorCCounter = 0

  	this.noiseGeneratorPhase = 0
  	this.noiseGeneratorPeriod = 16
  	this.noiseGeneratorCounter = 0
  	this.noiseGeneratorSeed = 1

  	this.toneChanAMask = 0x00
  	this.toneChanBMask = 0x00
  	this.toneChanCMask = 0x00
  	this.noiseChanAMask = 0x00
  	this.noiseChanBMask = 0x00
  	this.noiseChanCMask = 0x00

  	this.envelopePeriod = 256
  	this.envelopeCounter = 0
  	this.envelopeRampCounter = 31
  	this.envelopeOnFirstRamp = true
  	this.envelopeAlternateMask = 0x00
  	this.envelopeAlternatePhase = 0x00
  	this.envelopeHoldMask = 0x00
  	this.envelopeAttackMask = 0x00
  	this.envelopeContinueMask = 0x00
  	this.envelopeValue = 0x00
    
    this.configure()
    console.info('Gasman backend', this)
  } // constructor
  
  configure(isYM = false, clockRate = 1773400, sr = 48000, panMode = 'MONO') {

    this.frequency = clockRate
  	this.sampleRate = sr
  	this.mode = isYM ? 'YM' : 'AY'
    this.volumeLevels = (this.mode == 'AY') ? this.VOLUME_LEVELS_AY : this.VOLUME_LEVELS_YM

  	this.cyclesPerSample = this.frequency / this.sampleRate
  	/* envelope runs at double speed of an AY to cater for YM envelopes - in AY mode speed is halved again via volume table */
  	this.cyclesPerSampleEnv = this.frequency / this.sampleRate * 2

    this.panning = this.STEREO_MODES[panMode.toUpperCase()]
    this.calcPanning()
  } // configure
  
  calcPanning() {
    this.panVolumeAdjust = []
    for (var i = 0; i < 3; i++) {
      /* kebby says we should do this. And you don't argue with kebby. http://conspiracy.hu/articles/8/ */
      this.panVolumeAdjust[i] = [
        Math.sqrt(1.0-this.panning[i]), Math.sqrt(this.panning[i])
      ]
    }
  }
  
  process(inputList, outputList, parameters) {

    for(let i = 0; i < outputList[0][0].length; i++) {
      this.toneGeneratorACounter -= this.cyclesPerSample
      while (this.toneGeneratorACounter < 0) {
        this.toneGeneratorACounter += this.toneGeneratorAPeriod
        this.toneGeneratorAPhase ^= 0xff
      }

      this.toneGeneratorBCounter -= this.cyclesPerSample
      while (this.toneGeneratorBCounter < 0) {
        this.toneGeneratorBCounter += this.toneGeneratorBPeriod
        this.toneGeneratorBPhase ^= 0xff
      }

      this.toneGeneratorCCounter -= this.cyclesPerSample
      while (this.toneGeneratorCCounter < 0) {
        this.toneGeneratorCCounter += this.toneGeneratorCPeriod
        this.toneGeneratorCPhase ^= 0xff
      }

      this.noiseGeneratorCounter -= this.cyclesPerSample
      while (this.noiseGeneratorCounter < 0) {
        this.noiseGeneratorCounter += this.noiseGeneratorPeriod

        if ((this.noiseGeneratorSeed + 1) & 2)
          this.noiseGeneratorPhase ^= 0xff

        /* rng is 17-bit shift reg, bit 0 is output.
           input is bit 0 xor bit 3.
        */
        if (this.noiseGeneratorSeed & 1) this.noiseGeneratorSeed ^= 0x24000
        this.noiseGeneratorSeed >>= 1
      }

      this.envelopeCounter -= this.cyclesPerSampleEnv
      while (this.envelopeCounter < 0) {
        this.envelopeCounter += this.envelopePeriod

        this.envelopeRampCounter--
        if (this.envelopeRampCounter < 0) {
          this.envelopeRampCounter = 31
          this.envelopeOnFirstRamp = false
          this.envelopeAlternatePhase ^= 0x01f
        }

        this.envelopeValue = (
          /* start with the descending ramp counter */
          this.envelopeRampCounter
          /* XOR with the 'alternating' bit if on an even-numbered ramp */
          ^ (this.envelopeAlternatePhase && this.envelopeAlternateMask)
        )
        /* OR with the 'hold' bit if past the first ramp */
        if (!this.envelopeOnFirstRamp) this.envelopeValue |= this.envelopeHoldMask
        /* XOR with the 'attack' bit */
        this.envelopeValue ^= this.envelopeAttackMask
        /* AND with the 'continue' bit if past the first ramp */
        if (!this.envelopeOnFirstRamp) this.envelopeValue &= this.envelopeContinueMask
      }

      let levelA = this.volumeLevels[
        ((this.registers[8] & 0x10) ? this.envelopeValue : (this.registers[8] & 0x0f)<<1)
        & (this.toneGeneratorAPhase | this.toneChanAMask)
        & (this.noiseGeneratorPhase | this.noiseChanAMask)
      ]
      let levelB = this.volumeLevels[
        ((this.registers[9] & 0x10) ? this.envelopeValue : (this.registers[9] & 0x0f)<<1)
        & (this.toneGeneratorBPhase | this.toneChanBMask)
        & (this.noiseGeneratorPhase | this.noiseChanBMask)
      ]
      let levelC = this.volumeLevels[
        ((this.registers[10] & 0x10) ? this.envelopeValue : (this.registers[10] & 0x0f)<<1)
        & (this.toneGeneratorCPhase | this.toneChanCMask)
        & (this.noiseGeneratorPhase | this.noiseChanCMask) 
      ]
      outputList[0][0][i] = (
        this.panVolumeAdjust[0][0] * levelA + this.panVolumeAdjust[1][0] * levelB + this.panVolumeAdjust[2][0] * levelC
      )
      outputList[1][0][i] = (
        this.panVolumeAdjust[0][1] * levelA + this.panVolumeAdjust[1][1] * levelB + this.panVolumeAdjust[2][1] * levelC
      )
    }
    
    
    
    return true // def. needed for Chrome
  } // process

	setRegister(reg, val) {
    //console.log(this.registers)
		this.registers[reg] = val
		switch(reg) {
			case 0:
			case 1:
				this.toneGeneratorAPeriod = (((this.registers[1] & 0x0f) << 8) | this.registers[0]) * 8
				if (this.toneGeneratorAPeriod === 0) this.toneGeneratorAPeriod = 8
				break
			case 2:
			case 3:
				this.toneGeneratorBPeriod = (((this.registers[3] & 0x0f) << 8) | this.registers[2]) * 8
				if (this.toneGeneratorBPeriod === 0) this.toneGeneratorBPeriod = 8
				break
			case 4:
			case 5:
				this.toneGeneratorCPeriod = (((this.registers[5] & 0x0f) << 8) | this.registers[4]) * 8
				if (this.toneGeneratorCPeriod === 0) this.toneGeneratorCPeriod = 8
				break
			case 6:
				this.noiseGeneratorPeriod = (val & 0x1f) * 16
				if (this.noiseGeneratorPeriod === 0) this.noiseGeneratorPeriod = 16
				break
			case 7:
				this.toneChanAMask = (val & 0x01) ? 0xff : 0x00
				this.toneChanBMask = (val & 0x02) ? 0xff : 0x00
				this.toneChanCMask = (val & 0x04) ? 0xff : 0x00
				this.noiseChanAMask = (val & 0x08) ? 0xff : 0x00
				this.noiseChanBMask = (val & 0x10) ? 0xff : 0x00
				this.noiseChanCMask = (val & 0x20) ? 0xff : 0x00
				break
			case 11:
			case 12:
				this.envelopePeriod = ((this.registers[12] << 8) | this.registers[11]) * 16
				if (this.envelopePeriod === 0) this.envelopePeriod = 16
				break
			case 13:
				this.envelopeCounter = 0
				this.envelopeRampCounter = 32
				this.envelopeOnFirstRamp = true
				this.envelopeAlternatePhase = 0x00
				this.envelopeHoldMask = (val & 0x01) ? 0x01f : 0x00
				this.envelopeAlternateMask = (val & 0x02) ? 0x01f : 0x00
				this.envelopeAttackMask = (val & 0x04) ? 0x01f : 0x00
				this.envelopeContinueMask = (val & 0x08) ? 0x01f : 0x00
				break
		}
	} // setRegister
	
  handleMessage_(event) {
    //console.log('[Processor:Received] ',event.data.msg)
    const r = event.data.a
    switch (event.data.msg) {
      case 'configure':
        this.configure(r[0], r[1], r[2], r[3])
        break
      case 'setPan':
        this.panning[r[0]] = r[1]
        this.calcPanning()
      case 'regs': // FYM 14 regs block
        for (let i = 0; i < 14; i++)
          this.setRegister(i, r[i])
        break
      case 'stop':
        for (let i = 0; i < 14; i++)
          this.setRegister(i, 0)
        break
      default:
    }
  } // handleMessage_
  
} // class

registerProcessor('gasman-audio-processor', Gasman)