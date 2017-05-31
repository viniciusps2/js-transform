const {get, set} = require('lodash')

module.exports = {transformFrom, mapFrom}

function transformFrom (schema) {
  return (data) => applyTransformFrom(schema, data)
}

function applyTransformFrom (schema, data, res = {}, index) {
  for (let prop in schema) {
  	if (['$parent', '$item'].indexOf(prop) >= 0) continue

  	let val = schema[prop]
  	let to = prop
    let from = val.path || val
    if (schema.$parent) from = `${schema.$parent}.${from}`
    let child = get(data, from)

    if (typeof from === 'function') {
    	from({res, to, parent: data, index})
    } else if (from instanceof Array) {
      mapFrom(from[0]['$item'], from[0])({res, to, parent: data, index})
    } else if (isPlainObj(from)) {
      let value = applyTransformFrom(from, data, {})
      set(res, to, value)
    } else {
    	let value = child
    	if (val.fn) value = val.fn(value, index, to)
      set(res, to, value)
    }
  }
  if (!Object.keys(res).length) return
  return res
}

function mapFrom (from, schema) {
	return ({res, to, parent, index}) => {
		const child = get(parent, from)
    const items = child && child
      .map((item, index) => {
        return item
        	? applyFnOrSchema(schema, item, parent, {}, index)
        	: undefined
      })
      .filter((item) => item !== undefined)
    items && items.length && set(res, to, items)
	}
}

function applyFnOrSchema (fnOrSchema, item, parent, res, index) {
	if (typeof fnOrSchema === 'function') {
		return fnOrSchema({item, parent, index, res})
	}
	return applyTransformFrom(fnOrSchema, item, res, index)
}

function isPlainObj (o) {
  return typeof o === 'object' && o !== null && o.constructor === Object
}
