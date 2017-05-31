const {get} = require('lodash')
const {transformTo, mapTo} = require('../lib')

describe('test-spec', () => {
  it('when .. should', function () {
    const data = {
      plant: 'SJK1',
      salesOrganization: 'salesorg',
      shipTo: {
        address: 'addr1',
        city: 'sjc'
      },
      parts: [
        {partNumber: 'pn2'},
        {partNumber: 'pn3'},
      ],
      items: [
        {ecode: 'e2'},
        {ecode: 'e3'},
      ],
      things: [
        {number: 'n2'},
        {number: 'n3'},
      ],
      notes: [
        {content: 'c2'},
        {content: 'c3'},
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
    // parts: [{
    //   $item: 'item',
    //   index: {path: 'KPOSN', fn: itemIndex},
    //   partNumber: {path: 'MATERIAL', fn: toUpperCase},
    // }],
    // items: mapTo('T_ITEM.item', {
    //   index: {path: 'KPOSN', fn: itemIndex},
    //   ecode: {path: 'MATERIAL', fn: toUpperCase},
    // }),
    // things: mapTo('THINGS.item', ({item, parent, index}) => ({
    //   'POS': itemIndex({index}),
    //   'NUMBER': item.number,
    //   'NUMBERCONCAT': item.number + '-' + get(parent, `items[${index}].ecode`),
    // })),
    // notes: mapTo('TEXT', ({item}) => {
    //   return item.content
    // }),
    // description: ({res, child}) => {
    //   res['DESCR'] = child.text.split(', ')
    // }
  })
}

