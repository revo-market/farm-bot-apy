import { BigNumber } from 'bignumber.js'
import { getAPYApprox } from './index'

describe('index', () => {
  it('getAPYApprox', () => {
    expect(
      getAPYApprox({
        apr: new BigNumber(0.005), // 0.5%
        compoundTimesPerYear: new BigNumber(12),
      }).toFixed(5),
    ).toBe('0.06168') // from example at https://www.investopedia.com/terms/a/apy.asp
  })
})
