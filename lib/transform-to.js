const {get, set} = require('lodash')

module.exports = {transformTo, mapTo}

function transformTo (schema) {
  return (data) => applyTransformTo(schema, data)
}

function applyTransformTo (schema, data, res = {}, index) {
  for (let prop in schema) {
  	if (['$parent', '$item'].indexOf(prop) >= 0) continue

  	let val = schema[prop]
    let to = val.path || val
    if (schema.$parent) to = `${schema.$parent}.${to}`
    let child = get(data, prop)

    if (typeof to === 'function') {
    	to({res, child, parent: data, index})
    } else if (to instanceof Array) {
      mapTo(to[0]['$item'], to[0])({res, child, parent: data, index})
    } else if (isPlainObj(to)) {
      applyTransformTo(to, child, res)
    } else {
    	let value = resolveValue(child, val, index, prop)
      set(res, to, value)
    }
  }
  if (!Object.keys(res).length) return
  return res
}

function mapTo (to, schema) {
	return ({res, child, parent, index}) => {
    const items = child && child
      .map((item, index) => {
        return item && typeof item === 'object'
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
	return applyTransformTo(fnOrSchema, item, res, index)
}

function resolveValue (child, val, index, prop) {
  child = child || val.default
  if (val.fn) child = val.fn(child, index, prop)
  return child
}

function isPlainObj (o) {
  return typeof o === 'object' && o !== null && o.constructor === Object
}
