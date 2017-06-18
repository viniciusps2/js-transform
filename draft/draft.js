'use strict'

// TRANSFORM-TO

// const {padStart, get, set} = require('lodash')
// const xsdParser = require('../js-xsd')
// module.exports = {transformTo, mapTo}

function transformTo (schema, options = {}) {
  const {xsd, rootElement} = options

  const fieldsSequence = loadFieldsSequence(xsd, rootElement)

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

function definePath (fieldsSequence, parentPath, to) {
  let path = castPath(to)
  const newPath = []

  if (fieldsSequence) {
    path.reduce((accPath, node) => {
      accPath.push(node)
      const fullPath = accPath.join('.')
      const index = (fieldsSequence.indexOf(fullPath) + 1) || 999
      const newName = padStart(index, 3, '0') + '#' + node
      newPath.push(newName)
      return accPath
    }, castPath(parentPath) || [])
  }
  return newPath.join('.')
}

function loadFieldsSequence (xsd, rootElement) {
  const fields = xsd && xsdParser.fieldsSequence(xsd)
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


function deep (obj, path, value) {
  if (arguments.length === 3) return set.apply(null, arguments)
  return get.apply(null, arguments)
}

function get (obj, path) {
  let keys = Array.isArray(path) ? path : path.split('.')
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
  let keys = Array.isArray(path) ? path : path.split('.')
  let i = 0
  for (; i < keys.length - 1; i++) {
    let key = keys[i]
    if (deep.p && !Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = {}
    obj = obj[key]
  }
  obj[keys[i]] = value
  return value
}

function padStart(nr, n, str){
  return Array(n-String(nr).length+1).join(str||'0')+nr;
}

function describe (str, fn) {
  console.log('-' + str) || fn()
}

function it (str, fn) {
  return describe(str, fn)
}

// SPECS

// const {get} = require('lodash')
// const {transformTo, mapTo} = require('../../lib/js-transform/transform-to')

describe('json-transform transform-to spec', () => {
  it('should transform to', function () {
    const data = {
      plant: 'SJK1',
      salesOrganization: 'salesorg',
      shipTo: {
        address: 'addr1',
        city: 'sjc'
      },
      parts: [
        {partNumber: 'pn2'},
        {partNumber: 'pn3'}
      ],
      items: [
        {ecode: 'e2'},
        {ecode: 'e3'}
      ],
      things: [
        {number: 'n2'},
        {number: 'n3'}
      ],
      notes: [
        {content: 'c2'},
        {content: 'c3'}
      ],
      description: {text: 'kkk, jjj, bbb'}
    }

    const res = transformRequest()(data)
    console.log('res', JSON.stringify(res, null, 2))
  })
})

function transformRequest () {
  const itemIndex = (value, index) => (index + 1) * 100
  const toUpperCase = (value) => value && value.toUpperCase()

  return transformTo({
    salesOrganization: 'ORG',
    plant: 'WERKS',
    shipTo: {
      $parent: 'K',
      address: 'ADDR',
      city: 'CITY'
    },
    parts: [{
      $item: 'item',
      index: {path: 'KPOSN', fn: itemIndex},
      partNumber: {path: 'MATERIAL', fn: toUpperCase}
    }],
    items: mapTo('T_ITEM.item', {
      index: {path: 'KPOSN', fn: itemIndex},
      ecode: {path: 'MATERIAL', fn: toUpperCase}
    }),
    things: mapTo('THINGS.item', ({item, parent, index}) => ({
      'POS': itemIndex({index}),
      'NUMBER': item.number,
      // 'NUMBERCONCAT': item.number + '-' + get(parent, `items[${index}].ecode`)
    })),
    notes: mapTo('TEXT', ({item}) => {
      return item.content
    }),
    description: ({res, child}) => {
      res['DESCR'] = child.text.split(', ')
    }
  })
}
