# AYSIR
AY Player

Maybe rename to YAMY (yummi), MAYY (may why), YMAY (why may), AMYY (amy why)

## Not sure what will happen here
11.10.2021: Put old goniometer in a OffscreenCanvas worker, done
11.10.2021: Quickly hooked up my old goniometer, maybe add an output channel for each A,B,C-channel

11.10.2021: Found out that with worklets it's a bit different to access the 2nd channel. So i had to rework the backends a bit to support 2 outputs, still not channels but at least accessible for the analyzer node.

10.10.2021: I will continue here with my goniometer, but this time a more modern shader version, maybe... :)

10.10.2021: Finalized a bit. Move on.. move on! Use the na(t)ive select to see that audio worklet is not interrupted by main ui thread. Click on slot machine for random song.

06.10.2021: I did dome tests with other Worklet, PaintWorklet. Not nice since it's on main thread and there is no message port for com.

04.10.2021: not much time today, but picking up again after holidays with my wife

22.09.2021: some progress was made. already 2 backends but frontend is blocking pusher since all comm is done through main thread
1 or 2 backends more and i should have a nice backend suite.

Sir Sinclair died 2 days ago and i also have to fix a problem with zipped AY thingy in jsVecx

## Goal
Make Worker script that fills AudioWorklet
This also needs decoding some formats like .fym

### Steps
+ Bring AYUMI into modern ES6 version
+ Then make Audioworklet
+ loader -> FYMreader -> AYUMI engine

HTML -> aysir.js module -> worker (load and pick reader, push data to worklet) -> Worklets (Ayumi, Cowbell, ...)

Is more than one worklet possible for turbo dual mode with two AY/YM chips emulation. Its a node, should be possible!

## Engines
+ AYUMI (compact code)
+ Gasman / Cowbell Demozoo (also had some format readers and a changed Lh4 lib, i put both lh4 libs together and made class)
- jsVecx Engine
- CODEF / Phaser Antoine Santo Aka NoNameNo, Nicolas CHALLEIL Aka STuFF

## Links
https://bulba.untergrund.net/progr_e.htm
https://documentation.help/AY-3-8910.12-ZX-Spectrum/ay_e0qjz.htm


https://github.com/norbertkehrer/soundtrakker_player

https://ym.mmcm.ru/

https://zxtunes.com/
http://sndh.atari.org/
http://aygor.abrimaal.pro-e.pl/
https://github.com/Abrimaal/AY-Format-Development

https://www.fenarinarsa.com/?p=1454
https://github.com/ESPboy-edu/ESPboy_PT3Play
https://github.com/ESPboy-edu/ESPboy_PT3Play/blob/master/PT3Play.h
https://github.com/deater/vmw-meter/blob/master/pi-chiptune/arm32/pt3_lib.c

http://www.julien-nevo.com/arkostracker/

https://bitbucket.org/zxtune/zxtune/src/develop/src/formats

http://leonard.oxg.free.fr/
https://www.fenarinarsa.com/?p=1454


## Formats https://bulba.untergrund.net/emulator_e.htm
1. Dumps of registers were recorded in many computers emulators:
	- OUT (recorded in ZX Spectrum emulator 'Z80' v3.xx by G.A. Lunter)
		Supported OUT files of ZX Spectrum emulator 'Z80' versions 3.02 and 3.03 by G.A. Lunter. OUT file has regular structure: sequence of five bytes blocks. First word in each block is time in Z80 processor tacts (range from 0 to 17471). Second word of block is ZX Spectrum port address. And last value of block (byte) is data is sent to this port during this tact. Each 17472nd tact in any case one block is wrote into OUT file, and if during this time no outing to any port of Speccy then first word of block is 65535. One tact of Z80 processor equal to 1/3494400 sec. OUT file can contain outing either to any Speccy ports or only to selected in 'Z80' emulator ports. To record outing only to AY-3-8910 ports (#BFFD and #FFFD), adjust 'Z80' emulator for storing only one port: #FD. And after creating OUT file convert it to other format (ZXAY file is optimized analog of OUT file).
	+ PSG (recorded in ZX Spectrum emulator 'Z80 Stealth' by Mr.Kirill, and in many other emulators)
	- EPSG (recorded in ZX Spectrum emulator 'Z80 Stealth')
	+ YM ('StSound Project' by Leonard/Oxygen files, supported YM2, YM3, YM3b, YM5 and YM6 subtypes) LHA packed data, BigEndian
	+ VTX ('Vortex Project' by V_Soft files)
	- ZXAY (designed specially for Ay_Emul)
2. Popular ZX Spectrum musical editors’ modules:
	- STC – Sound Tracker v1.xx
	- PSC – Pro Sound Creator v1.xx
	- ASC – ASC Sound Master v0.xx–2.xx
	- PT1, PT2, PT3 – Pro Tracker v1.xx–3.xx, Vortex Tracker II v1.0
	- STP – Sound Tracker Pro
	- FTC – Fast Tracker v1.xx
	- FLS – Flash Tracker
	- SQT – SQ-Tracker
	- GTR – Global Tracker v1.x
	- FXM – Fuxoft AY Language
	- AY of AMAD subtype – Amadeus modules, FXM analog
	- PSM – Pro Sound Maker
3. ZX Spectrum’s or Amstrad CPC’s memory dumps with player for Z80 processor:
	- AY of EMUL subtype (DeliAY and AYPlay projects files)
	- AYM (RDOSPLAY project files)
4. More Formats (Added by DrSnuggles)
	+ FYM - https://ym.mmcm.ru/ - Zipped raw data, LittleEndian of registers just need to be streamed to PSG
	- AKS - Arkos Tracker 1+2 3/9ch/unlimited channels + digidrums
	- SKS - STarKos Tracker
	- VT2 - Vortex Tracker 2
	- 128 - BSC's Soundtrakker
	- Wyz - Wyz Tracker
	- CHP - Chip'n'sfx
5. Format list from zxart.ee:
	- AS0 - ASC Sound Master v0.x (2 songs)
	- ASC - ASC Sound Master v1.x (1337 songs)
	- AY - ZXAYEMUL (3027 songs)
	- CHI - Chip Tracker v1.0 (23 songs)
	- COP - Sam Coupé - ETC - E-Tracker v1.x (589 songs)
	- DMM - Digital Music Maker v1.x (99 songs)
	- DST - Digital Studio (Covox/SD) (350 songs)
	- ET1 - Extreme Tracker v1.31
	- FTC - Fast Tracker v1.00
	- GTR - Global Tracker v1.0 (4 songs)
	- MP3 - ;)
	- MTC - mtctool r3270 Apr 21 2015 windows-x86 i686 (TurboSound and FM)
	- PDT - ProDigi Tracker v0.0x (just 9 results on zxart)
	- PSC - Pro Sound Creator v1.07
	+ PSG - Its a dump from many
	- PSM - Pro Sound Maker
	- PT1 - Pro Tracker v1.x
	- PT2 - Pro Tracker v2.x
	- PT3 - Pro Tracker v3.x / Vortex Tracker II v1.0 (8869 songs)
	- SQD - SQ Digital Tracker
	- SQT - SQ-Tracker Compiled (https://zxart.ee/eng/authors/x/x-agon/warhawk-atari800rob-hubbard/)
	- ST1 - Sound Tracker v1.x (13 songs) (https://github.com/norbertkehrer/soundtrakker_player)
	- ST3 - Sound Tracker v3.x Compiled
	- STC - SONG BY ST COMPILE - Sound Tracker v1.x (2276 songs)
	- STP - Sound Tracker Pro v1.x
	- STR - Sample Tracker v2.x
	- TF0 - TFM Music Maker v0.1-1.2
	- TFC - TurboFM Compiler v1.1
	- TFD ?? just a single song on zxart.ee
	- TFE - TFM Music Maker v1.3+
	- TS - TurboSound = 2x AY = 6ch (have pt3 (vortexII 1.0 and FYM with such)) nq: BadApple or aGGreSSor: Monday or scalesmann: Split Minds (CC1st place)
	+ VTX (121 songs)
	+ YM (12 songs)

## Credits
AYUMI Original Author: Peter Sovietov

AYUMI Javascript version: Alexander Kovalenko

Demozoo / Cowbell / Matt "Gasman" Westcott: https://github.com/demozoo/cowbell

^^ Backend and format readers

FYMReader Original: http://pure-garden-1548.herokuapp.com/

FYMReader v5: https://ym.mmcm.ru/

UZIP ES6 module version from Greggman: https://github.com/greggman/uzip-module

LH4: many see header
