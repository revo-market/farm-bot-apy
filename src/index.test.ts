import { BigNumber } from 'bignumber.js'
import { _getAPYApprox } from './index'

describe('getAPYApprox', () => {
  it('works for monthly compounding', () => {
    expect(
      _getAPYApprox({
        apr: new BigNumber(0.06), // 6%
        compoundTimesPerYear: new BigNumber(12),
      }).toFixed(5),
    ).toEqual('0.06168') // from example at https://www.investopedia.com/terms/a/apy.asp
  })
  it('works for more than daily compounding', () => {
    const apr = new BigNumber('0.50')
    const compoundTimesPerYear = new BigNumber('75000')
    expect(
      _getAPYApprox({
        apr,
        compoundTimesPerYear,
      }).toFixed(5),
    ).toEqual('0.64816') // estimate should be same as daily compounding
  })
})
