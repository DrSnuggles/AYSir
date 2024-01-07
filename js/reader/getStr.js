export function getStr(dump, ptr, len) { // common entry
	if (typeof len === 'undefined') {
		return getStrNULL(dump, ptr)
	}
	return getStrFixed(dump, ptr, len)
}
function getStrFixed(dump, ptr, len) { // fixed length
	let c, r = ''
	for (let i = 0; i < len; i++) {
		r += String.fromCharCode( dump[ptr++] )
	}
	return r
}
function getStrNULL(dump, ptr) { // NULL terminated
	let c, r = ''
	while (c = dump[ptr++]) r += String.fromCharCode(c)
	return r
}

export function findBytes(haystack, needle) { // returns positions found
	// hay and needle are arrays
	let r = [] // return of all findings

	// loop once over haystack
	for (let i = 0, e = haystack.length - needle.length; i < e; i++) { // needle should fit in
		let j = 0
		while (j < needle.length) {
			if (haystack[i+j] !== needle[j]) break // not found
			j++
		}
		if (j == needle.length) r.push(i) // found complete needle at pos i
	}
	return r
}
