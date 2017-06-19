'use strict'

// const {get, set} = require('lodash')
const xsdParser = require('../js-xsd')
const {get, set, castPath, concat, isPlainObj, resolveValue} = require('./utils')

module.exports = {transformTo, mapTo}

function transformTo (schema, options = {}) {
  const {xsd, fieldsSequence} = options

  if (xsd) fieldsSequence = xsdParser.fieldsSequence(xsd)

  return (data) => {
    const json = applyTransformTo(schema, data)
    if (fieldsSequence) return jsonToMapInSequence(fieldsSequence, json)
    return json
  }
}

function applyTransformTo (schema, data, res = {}, index = null, prevParentPath = []) {
  const parentPath = concat(prevParentPath, schema.$parent)
  for (let prop in schema) {
    if (['$parent', '$item'].indexOf(prop) >= 0) continue

    const definition = schema[prop]
    const toPath = typeof definition === 'string' ? definition : definition.path

    let value = get(data, prop)
    const delegateParams = {value, parent: data, res, index, parentPath}

    if (typeof definition === 'function') {
      definition(delegateParams)
    } else if (definition instanceof Array) {
      mapTo(definition[0]['$item'], definition[0])(delegateParams)
    } else if (!toPath && isPlainObj(definition)) {
      applyTransformTo(definition, value, res, null, parentPath)
    } else {
      let resolvedValue = resolveValue(value, definition, index, prop)
      const fullPath = castPath(concat(parentPath, toPath))
      set(res, fullPath, resolvedValue)
    }
  }
  if (!Object.keys(res).length) return
  return res
}

function mapTo (toPath, schema) {
  return ({value, parent, res, index, parentPath}) => {
    const items = value && value
      .map((item, index) => {
        if (!item || typeof item !== 'object') return
        return applyFnOrSchema(schema, item, parent, {}, index)
      })
      .filter((item) => item !== undefined)

    const fullPath = castPath(concat(parentPath, toPath))
    items && items.length && set(res, fullPath, items)
  }
}

function applyFnOrSchema (fnOrSchema, item, parent, res, index) {
  if (typeof fnOrSchema === 'function') {
    return fnOrSchema({parent, item, res, index})
  }
  return applyTransformTo(fnOrSchema, item, res, index)
}

function jsonToMapInSequence (fieldsSequence, json, parentPath = []) {
  if (!isPlainObj(json)) return json
  const mapObj = new Map()

  const fields = Object.keys(json).sort((a, b) => {
    return getFieldPosition(fieldsSequence, parentPath, a) > getFieldPosition(fieldsSequence, parentPath, b) ? 1 : -1
  })

  for (let prop of fields) {
    let value = json[prop]
    const fullPath = concat(parentPath, prop)

    if (value instanceof Array) {
      const converted = value.map((item) => jsonToMapInSequence(fieldsSequence, item, fullPath))
      mapObj.set(prop, converted)
    } else if (isPlainObj(value)) {
      mapObj.set(prop, jsonToMapInSequence(fieldsSequence, value, fullPath))
    } else {
      mapObj.set(prop, value === undefined ? '' : value)
    }
  }
  return mapObj
}

function getFieldPosition (fieldsSequence, parentPath, field) {
  const fullPath = concat(parentPath, field).join('.')
  return (fieldsSequence.indexOf(fullPath) + 1) || 999
}
