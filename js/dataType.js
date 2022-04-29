export class dataType {
	
	constructor(data) {
		this.data = data
		this.pos = 0
		this.endian = 'BIG'
	}

	readBytes(offset, nb) {
		let tmp = ''
		for (let i = 0; i < nb; i++) {
			tmp += this.data[offset + this.pos++]
		}
		return tmp
	}

	readMultiByte(nb, type) {
		if (type == 'txt') {
			let tmp = ''
			for (let i = 0; i < nb; i++) {
				tmp += this.data[this.pos++]
			}
			return tmp
		}
	}

	readInt() {
		const tmp1 = parseInt(this.data[this.pos + 0].charCodeAt(0).toString(16), 16)
		const tmp2 = parseInt(this.data[this.pos + 1].charCodeAt(0).toString(16), 16)
		const tmp3 = parseInt(this.data[this.pos + 2].charCodeAt(0).toString(16), 16)
		const tmp4 = parseInt(this.data[this.pos + 3].charCodeAt(0).toString(16), 16)
		let tmp
		if (this.endian == 'BIG')
			tmp = (tmp1 << 24) | (tmp2 << 16) | (tmp3 << 8) | tmp4
		else
			tmp = (tmp4 << 24) | (tmp3 << 16) | (tmp2 << 8) | tmp1
		this.pos += 4
		return tmp
	}

	readShort() {
		const tmp1 = parseInt(this.data[this.pos + 0].charCodeAt(0).toString(16), 16)
		const tmp2 = parseInt(this.data[this.pos + 1].charCodeAt(0).toString(16), 16)
		const tmp = (tmp1 << 8) | tmp2
		this.pos += 2
		return tmp
	}
	readByte() {
		const tmp = parseInt(this.data[this.pos].charCodeAt(0).toString(16), 16)
		this.pos += 1
		return tmp
	}
	readString() {
		let tmp = ''
		while (1) {
			if (this.data[this.pos++].charCodeAt(0) != 0)
				tmp += this.data[this.pos - 1]
			else
				return tmp
		}
	}

	substr(start, nb) {
		return this.data.substr(start, nb)
	}

	bytesAvailable() {
		return this.length - this.pos
	}
}