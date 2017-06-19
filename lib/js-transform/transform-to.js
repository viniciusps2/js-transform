'use strict'

const {padStart, get, set} = require('lodash')
const xsdParser = require('../js-xsd')
module.exports = {transformTo, mapTo}

function transformTo (schema, options = {}) {
  const {xsd, rootElement, fieldsSequence} = options

  if (xsd) fieldsSequence = loadFieldsSequence(xsd, rootElement)

  return (data) => {
    const json = applyTransformTo(schema, fieldsSequence, data)
    if (fieldsSequence) return jsonToMapInSequence(json)
    return json
  }
}

function applyTransformTo (schema, fieldsSequence, data, res = {},
                          index = null, parentPath = []) {
  if (schema.$parent) parentPath.push(schema.$parent)

  for (let prop in schema) {
    if (['$parent', '$item'].indexOf(prop) >= 0) continue

    let definition = schema[prop]
    let to = definition.path || definition

    const child = get(data, prop)
    const delegateParams = {res, child, parent: data, index, fieldsSequence, parentPath}

    if (typeof to === 'function') {
      to(delegateParams)
    } else if (to instanceof Array) {
      mapTo(to[0]['$item'], to[0])(delegateParams)
    } else if (isPlainObj(to)) {
      applyTransformTo(to, fieldsSequence, child, res, null, parentPath)
    } else {
      let value = resolveValue(child, definition, index, prop)
      // if (schema.$parent) to = `${schema.$parent}.${to}`
      let path = definePath(fieldsSequence, parentPath, to)
      set(res, path, value)
    }
  }
  if (!Object.keys(res).length) return
  return res
}

function mapTo (to, schema) {
  return ({res, child, parent, index, fieldsSequence, parentPath}) => {
    const items = child && child
      .map((item, index) => {
        if (!item || typeof item !== 'object') return
        return applyFnOrSchema(schema, fieldsSequence, item, parent, {}, index, concat(parentPath, to))
      })
      .filter((item) => item !== undefined)

    let path = definePath(fieldsSequence, parentPath, to)
    items && items.length && set(res, path, items)
  }
}

function applyFnOrSchema (fnOrSchema, fieldsSequence, item, parent, res, index, parentPath) {
  if (typeof fnOrSchema === 'function') {
    return fnOrSchema({item, fieldsSequence, parent, index, res, parentPath})
  }
  return applyTransformTo(fnOrSchema, fieldsSequence, item, res, index, parentPath)
}

function resolveValue (child, val, index, prop) {
  child = child === undefined ? val.default : child
  if (val.fn) child = val.fn(child, index, prop)
  return child
}

function jsonToMapInSequence (json) {
  const mapObj = new Map()

  Object.keys(json).sort().forEach((prop) => {
    let value = json[prop]
    const key = prop.split('#').slice(-1)[0]
    // const key = prop

    if (isPlainObj(value)) {
      mapObj.set(key, jsonToMapInSequence(value))
    } else if (value instanceof Array) {
      const converted = value.map((item) => jsonToMapInSequence(item))
      mapObj.set(key, converted)
    } else {
      mapObj.set(key, value === undefined ? '' : value)
    }
  })
  return mapObj
}

function definePath (fieldsSequence, parentPath, to) {
  if (!fieldsSequence) return to

  let path = castPath(to)
  const newPath = []
  path.reduce((accPath, node) => {
    accPath.push(node)
    const fullPath = accPath.join('.')
    const index = (fieldsSequence.indexOf(fullPath) + 1) || 999
    const newName = padStart(index, 3, '0') + '#' + node
    newPath.push(newName)
    return accPath
  }, castPath(parentPath) || [])
  return newPath.join('.')
}

function loadFieldsSequence (xsd, rootElement) {
  const fields = xsdParser.fieldsSequence(xsd)
  if (rootElement && fields) {
    return fields.map((s) => s.replace(new RegExp('^' + rootElement + '.'), ''))
  }
  return fields
}

function castPath (path) {
  if (!path || !path.length) return []
  return path instanceof Array ? path.join('.').split('.') : path.split('.')
}

function concat (fullParentPath = [], path = []) {
  return fullParentPath.concat(path)
}

function isPlainObj (o) {
  return typeof o === 'object' && o !== null && o.constructor === Object
}
