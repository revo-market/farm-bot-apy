import { HttpFunction } from '@google-cloud/functions-framework/build/src/functions'
import { BigNumber } from 'bignumber.js'
import { FARM_DATA } from './constants'

/**
 * Get the LP balance of a farm bot.
 *
 * @param farmBot
 */
function getLPBalance({
  zapLPAddress,
  FPTokenAddress,
}: {
  baseLPAddress: string
  FPTokenAddress: string
}): Promise<BigNumber> {
  // TODO
}

/**
 * Get the USD value of a meta-liquidity provider token.
 *
 * NOTE: assumes meta-LP has mcUSD on one side of the pool!!
 *
 * @param metaLP
 */
function getMetaLPUSDValueApprox(metaLP: string): Promise<BigNumber> {
  // TODO
}

/**
 * Get the APY of a farm bot.
 *
 * Uses recent "Compound" events to determine the rate of appreciation and compounding frequency.
 *
 * @param farmBotAddress
 */
function getFarmBotAPY(farmBotAddress: string): Promise<BigNumber> {
  // TODO (use Compound events)
}

function getAPY(apr: BigNumber, compoundTimesPerYear: number): BigNumber {
  // TODO
}

interface FarmBotAPY {
  [farmBotAddress: string]: {
    apy: string
  }
}

export const getAllMetaFarmsAPY: HttpFunction = async (_req, res) => {
  const output: FarmBotAPY = {}
  for (const farmData of FARM_DATA) {
    if (farmData.metaFarmBotAddress) {
      output[farmData.metaFarmBotAddress] = {
        apy: (await getFarmBotAPY(farmData.metaFarmBotAddress)).toString(10),
      }
    }
  }
  res.status(200).send(output)
}
