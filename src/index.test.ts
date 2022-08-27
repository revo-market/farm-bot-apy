import { getAPY } from 'src'
import {BigNumber} from "bignumber.js";

describe('index', () => {
  it("getAPY", () => {
    expect(getAPY(new BigNumber(0.5), 12)).toBe(new BigNumber(6.17)) // from example at https://www.investopedia.com/terms/a/apy.asp
  })
})
