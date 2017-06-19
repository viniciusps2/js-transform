function resolveValue (value, definition, index, prop) {
  value = value === undefined ? definition.default : value
  if (definition.fn) value = definition.fn(value, index, prop)
  return value
}

function castPath (path) {
  if (!path || !path.length) return []
  return path instanceof Array ? path.join('.').split('.') : path.split('.')
}

function concat (... args) {
  return [].concat.apply([], args.filter(Boolean))
}

function isPlainObj (o) {
  return typeof o === 'object' && o !== null && o.constructor === Object
}

function toArray (items) {
  return Array.isArray(items) ? items : (items ? [items] : [])
}


function deep (obj, path, value) {
  if (arguments.length === 3) return set.apply(null, arguments)
  return get.apply(null, arguments)
}

function get (obj, path) {
  let keys = Array.isArray(path) ? path : path.replace(/(\[|\]\.|\])/g, '.').split('.')
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i]
    if (!obj || !Object.prototype.hasOwnProperty.call(obj, key)) {
      obj = undefined
      break
    }
    obj = obj[key]
  }
  return obj
}

function set (obj, path, value) {
  let keys = Array.isArray(path) ? path : path.replace(/(\[|\]\.|\])/g, '.').split('.')
  let i = 0
  for (; i < keys.length - 1; i++) {
    let key = keys[i]
    if (!Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = {}
    obj = obj[key]
  }
  obj[keys[i]] = value
  return value
}

module.exports = {
  castPath,
  concat,
  isPlainObj,
  toArray,
  deep,
  get,
  set,
  resolveValue
}
