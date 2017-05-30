const {merge, get, set} = require('lodash')
// const {flatJson} = require('eparts-shared/lib/helpers')

module.exports = {TransformTo}

function TransformTo ({data, schema, functions}) {
  return applyTransformTo(data, schema, functions)
}

function applyTransformTo (data, schema, functions, index) {
  let res = {}
  for (let prop in schema) {
  	if (['$parent', '$item'].indexOf(prop) >= 0) continue

  	let val = schema[prop]
    let to = val.path || val
    if (to instanceof Array) {
      const items = get(data, prop)
        .map((item, index) => {
          return item && typeof item === 'object'
          	? applyTransformTo(item, to[0], functions, index)
          	: item
        })
      set(res, to[0]['$item'], items)
    } else if (isPlainObj(to)) {
      const dataValue = applyTransformTo(get(data, prop, functions), to)
      merge(res, dataValue)
    } else {
    	let dataValue = get(data, prop)
			let fn = typeof val.fn === 'string' ? functions[val.fn] : val.fn
    	if (fn) dataValue = fn(dataValue, prop, index)

      set(res, to, dataValue)
    }
  }
  if (!Object.keys(res).length) return
  return res
}

function isPlainObj (o) {
  return typeof o === 'object' && o !== null && o.constructor === Object
}
