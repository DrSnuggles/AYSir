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
