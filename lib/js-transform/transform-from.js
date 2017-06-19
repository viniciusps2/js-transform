'use strict'

const {get, set, castPath, concat, isPlainObj, toArray, resolveValue} = require('./utils')

module.exports = {transformFrom, mapFrom}

function transformFrom (schema) {
  return (data) => applyTransformFrom(schema, data)
}

function applyTransformFrom (schema, data, res = {}, index = null, prevParentPath = []) {
  const parentPath = concat(prevParentPath, schema.$parent)

  for (let prop in schema) {
    if (['$parent', '$item'].indexOf(prop) >= 0) continue

    const definition = schema[prop]
    const toPath = prop
    const fromPath = typeof definition === 'string' ? definition : definition.path
    const delegateParams = {res, toPath, parent: data, index, parentPath}

    if (typeof definition === 'function') {
      definition(delegateParams)
    } else if (definition instanceof Array) {
      mapFrom(definition[0]['$item'], definition[0])(delegateParams)
    } else if (!fromPath && isPlainObj(definition)) {
      const value = applyTransformFrom(definition, data, {}, null, parentPath)
      set(res, toPath, value)
    } else {
      const fullPath = castPath(concat(parentPath, fromPath))
      const value = resolveValue(get(data, fullPath), definition, index, toPath)
      set(res, toPath, value)
    }
  }
  if (!Object.keys(res).length) return
  return res
}

function mapFrom (fromPath, schema) {
  return ({res, toPath, parent, index, parentPath}) => {
    const fullPath = castPath(concat(parentPath, fromPath))
    const items = toArray(get(parent, fullPath))
      .map((item, index) => {
        if (!item) return
        return applyFnOrSchema(schema, item, parent, {}, index)
      })
      .filter((item) => item !== undefined)
    items && items.length && set(res, toPath, items)
  }
}

function applyFnOrSchema (fnOrSchema, item, parent, res, index) {
  if (typeof fnOrSchema === 'function') {
    return fnOrSchema({item, parent, index, res})
  }
  return applyTransformFrom(fnOrSchema, item, res, index)
}
