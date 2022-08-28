import { HttpFunction } from '@google-cloud/functions-framework/build/src/functions'
import { BigNumber } from 'bignumber.js'
import { FARM_DATA, mcUSD_ADDRESS_MAINNET } from './constants'
import ethers from "ethers";
import {FarmBotValue} from "./types";

const FARM_BOT_ABI = require('./abis/FarmBot.json')
const ERC20_ABI = require('./abis/ERC20.json')

const RPC_URL = 'https://forno.celo.org'

const rpcProvider = new ethers.providers.JsonRpcProvider(RPC_URL)


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
 * Get the approximate USD value of a meta-liquidity provider token.
 *
 * NOTE: assumes meta-LP has mcUSD on one side of the pool!!
 * NOTE2: "approx" because the LP is not guaranteed to be balanced (assumes arbitrage is working its magic)
 *
 * @param metaLP
 */
async function getMetaLPUSDValueApprox(metaLP: string): Promise<BigNumber> {
  const mcUSDContract = new ethers.Contract(mcUSD_ADDRESS_MAINNET, ERC20_ABI, rpcProvider)
  const mcUSDInPool = await mcUSDContract.balanceOf(metaLP)
  return new BigNumber(mcUSDInPool)
    .multipliedBy(2, 10) // account for approx value of RFP in pool, if arbitrage working
    .dividedBy(new BigNumber(10).exponentiatedBy(18)) // convert from wei to eth (in this case USD)
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

export function getAPY(apr: BigNumber, compoundTimesPerYear: number): BigNumber {
  return apr
    .div(compoundTimesPerYear)
    .plus(1)
    .exponentiatedBy(compoundTimesPerYear)
    .minus(1)
}

export const getAllMetaFarmsAPY: HttpFunction = async (_req, res) => {
  const output: FarmBotValue = {}
  for (const farmData of FARM_DATA) {
    if (farmData.metaFarmBotAddress) {
      output[farmData.metaFarmBotAddress] = {
        apy: (await getFarmBotAPY(farmData.metaFarmBotAddress)).toString(10),
        tvlUSD: (await getMetaLPUSDValueApprox(farmData.zapLPAddress)).toString(10)
      }
    }
  }
  res.status(200).send(output)
}
