const {get} = require('lodash')
const {transformFrom, mapFrom} = require('../lib')

describe('test-spec', () => {
  it('when .. should', function () {
    const response = {
      'ORG': 'salesorg',
      'WERKS': 'SJK1',
      'K': {
        'ADDR': 'addr1',
        'CITY': 'sjc'
      },
      'item': [
        {
          'KPOSN': 100,
          'MATERIAL': 'PN2'
        },
        {
          'KPOSN': 200,
          'MATERIAL': 'PN3'
        }
      ],
      'T_ITEM': {
        'item': [
          {
            'KPOSN': '0100',
            'MATERIAL': 'E2'
          },
          {
            'KPOSN': '0200',
            'MATERIAL': 'E3'
          }
        ]
      },
      'THINGS': {
        'item': [
          {
            'POS': 100,
            'NUMBER': 'n2',
            'NUMBERCONCAT': 'n2-e2'
          },
          {
            'POS': 200,
            'NUMBER': 'n3',
            'NUMBERCONCAT': 'n3-e3'
          }
        ]
      },
      'TEXT': [
        'c2',
        'c3'
      ],
      'DESCR': [
        'kkk',
        'jjj',
        'bbb'
      ]
    }

    const res = transformResponse()(response)
    console.log('res', JSON.stringify(res, null, 2))
  })
})

function transformResponse () {
  const itemIndex = (value, index) => (index + 1) * 100
  const toUpperCase = (value) => value && value.toUpperCase()

  return transformFrom({
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
      partNumber: {path: 'MATERIAL', fn: toUpperCase},
    }],
    items: mapFrom('T_ITEM.item', {
      index: {path: 'KPOSN', fn: Number},
      ecode: {path: 'MATERIAL', fn: toUpperCase},
    }),
    things: mapFrom('THINGS.item', ({item, parent, index}) => ({
      'pos': item.POS,
      'number': item.NUMBER,
      'concat': item.NUMBER + '-' + get(parent, `T_ITEM.item[${index}].MATERIAL`),
    })),
    notes: mapFrom('TEXT', ({item}) => {
      return {content: item}
    }),
    description: ({res, parent}) => {
      res['description'] = parent.DESCR.join(', ')
    }
  })
}

