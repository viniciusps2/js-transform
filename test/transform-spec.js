const {TransformTo, TransformFrom} = require('../lib')

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
      ]
    }

    const res = transformRequest(data)
    console.log('res', JSON.stringify(res, null, 2))
  })
})

function transformRequest (data) {
  const schema = {
    salesOrganization: 'ORG',
    plant: 'WERKS',
    shipTo: {
      address: 'K.ADDR',
      city: 'K.CITY'
    },
    parts: [{
      $item: 'item',
      index: {path: 'KPOSN', fn: 'itemIndex'},
      partNumber: {path: 'MATERIAL', fn: (value) => value.toUpperCase()},
    }]
  }

  const functions = {
    'itemIndex': (value, prop, index) => (index + 1) * 100
  }

  return TransformTo({data, schema, functions})
}
