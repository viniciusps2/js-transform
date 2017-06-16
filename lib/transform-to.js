const {padStart, get, set} = require('lodash')
const xsd = require('../js-xsd')
module.exports = {transformTo, mapTo}

function transformTo (schema, options) {
  const {structure} = options

  let fieldsSequenceObj
  if (structure) fieldsSequenceObj = compileStructure(structure)

  return (data) => {
    const json = applyTransformTo(schema, fieldsSequenceObj, data)
    if (fieldsSequenceObj) return jsonToMapInSequence(json)
    return json
  }
}

function applyTransformTo (schema, fieldsSequenceObj, data, res = {}, index, parentPath) {
  for (let prop in schema) {
    if (['$parent', '$item'].indexOf(prop) >= 0) continue

    let val = schema[prop]
    let to = val.path || val
    if (schema.$parent) to = `${schema.$parent}.${to}`

    const child = get(data, prop)
    const delegateParams = {res, child, parent: data, index, fieldsSequenceObj}

    if (typeof to === 'function') {
      to(delegateParams)
    } else if (to instanceof Array) {
      mapTo(to[0]['$item'], to[0])(delegateParams)
    } else if (isPlainObj(to)) {
      applyTransformTo(to, fieldsSequenceObj, child, res, null, schema.$parent)
    } else {
      let value = resolveValue(child, val, index, prop)
      let path = definePath(fieldsSequenceObj, parentPath, to)
      set(res, path, value)
    }
  }
  if (!Object.keys(res).length) return
  return res
}

function mapTo (to, schema) {
  return ({res, child, parent, index, fieldsSequenceObj}) => {
    const items = child && child
      .map((item, index) => {
        return item && typeof item === 'object'
          ? applyFnOrSchema(schema, fieldsSequenceObj, item, parent, {}, index, to)
          : undefined
      })
      .filter((item) => item !== undefined)
    items && items.length && set(res, to, items)
  }
}

function applyFnOrSchema (fnOrSchema, fieldsSequenceObj, item, parent, res, index, parentPath) {
  if (typeof fnOrSchema === 'function') {
    return fnOrSchema({item, fieldsSequenceObj, parent, index, res, parentPath})
  }
  return applyTransformTo(fnOrSchema, fieldsSequenceObj, item, res, index, parentPath)
}

function resolveValue (child, val, index, prop) {
  child = child === undefined ? val.default : child
  if (val.fn) child = val.fn(child, index, prop)
  return child
}

function compileStructure (structure, count = 0) {
  const res = {$index: count}
  for (let prop in structure) {
    let value = structure[prop]
    if (isPlainObj(value)) {
      res[prop] = compileStructure(value, count)
    } else {
      res[prop] = count++
    }
  }
  return res
}

function jsonToMapInSequence (json) {
  const map = new Map()

  Object.keys(json).sort().forEach((prop) => {
    let value = json[prop]
    const key = prop.split('#').slice(-1)[0]
    // const key = prop

    if (isPlainObj(value)) {
      map.set(key, jsonToMapInSequence(value))
    } else if (value instanceof Array) {
      const converted = value.map((item) => jsonToMapInSequence(item))
      map.set(key, converted)
    } else {
      map.set(key, value === undefined ? '' : value)
    }
  })
  return map
}

function definePath (fieldsSequenceObj, parentPath, to) {
  let path = to
  const fullPath = concatPath(parentPath, to)
  const index = get(fieldsSequenceObj, fullPath) || 100
  if (fieldsSequenceObj) path = padStart(index, 3, '0') + '#' + path
  return path
}


function concatPath (parentPath, path) {
  return (parentPath ? `${parentPath}.` : '') + path
}

function isPlainObj (o) {
  return typeof o === 'object' && o !== null && o.constructor === Object
}
