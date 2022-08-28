import { HttpFunction } from '@google-cloud/functions-framework/build/src/functions'
import { BigNumber } from 'bignumber.js'
import { FARM_DATA, mcUSD_ADDRESS_MAINNET } from './constants'
import { FarmBotValue } from './types'
import FARM_BOT_ABI from './abis/FarmBot.json'
import ERC20_ABI from './abis/ERC20.json'
import { ethers } from 'ethers'

const RPC_URL = 'https://forno.celo.org'

const SECONDS_PER_BLOCK = 5
const SECONDS_PER_DAY = 24 * 60 * 60
const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365
const BLOCKS_PER_DAY = SECONDS_PER_DAY / SECONDS_PER_BLOCK

const rpcProvider = new ethers.providers.JsonRpcProvider(RPC_URL)

/**
 * Get the LP balance of a farm bot.
 *
 * @param farmBotAddress
 */
async function getLPBalance(farmBotAddress: string): Promise<BigNumber> {
  const farmBotContract = new ethers.Contract(
    farmBotAddress,
    FARM_BOT_ABI,
    rpcProvider,
  )
  const lpAddress = await farmBotContract.stakingToken()
  const lpContract = new ethers.Contract(lpAddress, ERC20_ABI, rpcProvider)
  const farmBotLPBalance = await lpContract.balanceOf(farmBotAddress)
  return new BigNumber(farmBotLPBalance)
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
  const mcUSDContract = new ethers.Contract(
    mcUSD_ADDRESS_MAINNET,
    ERC20_ABI,
    rpcProvider,
  )
  const mcUSDInPool = (await mcUSDContract.balanceOf(metaLP)).toString()
  const lpContract = new ethers.Contract(metaLP, ERC20_ABI, rpcProvider)
  const lpTotalSupply = (await lpContract.totalSupply()).toString()
  return new BigNumber(mcUSDInPool)
    .multipliedBy(2) // account for approx value of RFP in pool, if arbitrage working
    .dividedBy(lpTotalSupply)
    .dividedBy(new BigNumber(10).exponentiatedBy(18)) // convert from wei to eth (in this case USD)
}

/**
 * Get the APY of a farm bot.
 *
 * Uses recent "Compound" events to determine the rate of appreciation and compounding frequency.
 *
 * @param farmBotAddress
 */
async function getFarmBotAPY(farmBotAddress: string): Promise<BigNumber> {
  const farmBotContract = new ethers.Contract(
    farmBotAddress,
    FARM_BOT_ABI,
    rpcProvider,
  )
  const compoundEventsFilter = farmBotContract.filters.Compound()
  const compoundEventsThisWeek = await farmBotContract.queryFilter(
    compoundEventsFilter,
    -BLOCKS_PER_DAY * 7,
    'latest',
  )
  if (compoundEventsThisWeek.length <= 2) {
    throw new Error('Not enough compound events found')
  }
  const [prevCompoundEvent, curCompoundEvent] = compoundEventsThisWeek.slice(-2)
  const compoundPeriodSeconds =
    (curCompoundEvent.blockNumber - prevCompoundEvent.blockNumber) *
    SECONDS_PER_BLOCK
  const compoundTimesPerYear = new BigNumber(
    SECONDS_PER_YEAR,
  ).dividedToIntegerBy(compoundPeriodSeconds)
  if (!curCompoundEvent.args) {
    throw new Error(`No args in compound event: ${curCompoundEvent}`)
  }
  const apr = compoundTimesPerYear
    .multipliedBy(curCompoundEvent.args.lpStaked.toString()) // toString is lame hack to get different BigNumber versions to work together
    .div(curCompoundEvent.args.newLPTotalBalance.toString()) // same here
  return getAPYApprox({ apr, compoundTimesPerYear })
}

/**
 * Get the approximate APY of an investment with a given APR and compounding frequency.
 *
 * If compounding more than daily, gives APY for compounding daily to save on compute.
 *
 * @param apr
 * @param compoundTimesPerYear
 */
export function getAPYApprox({
  apr,
  compoundTimesPerYear,
}: {
  apr: BigNumber
  compoundTimesPerYear: BigNumber
}): BigNumber {
  const compoundTimesApprox = compoundTimesPerYear.gt(365)
    ? 365
    : compoundTimesPerYear
  return apr
    .plus(1)
    .exponentiatedBy(compoundTimesApprox)
    .minus(1)
}

/**
 * Get the APY and TVL of all "meta" farm bots. (Excludes "normal" farm bots.)
 *
 * NOTE: TVL is given in ethers, not wei
 * NOTE2: APY is given as a fraction, not a percentage
 *
 * @param _req
 * @param res
 */
export const getAllMetaFarmsAPY: HttpFunction = async (_req, res) => {
  // TODO need to run compounder on meta-farms to get this to work! (not enough compound events otherwise)
  const output: FarmBotValue = {}
  for (const farmData of FARM_DATA) {
    const metaFarmBotAddress = farmData.metaFarmBotAddress
    if (metaFarmBotAddress) {
      output[metaFarmBotAddress] = {
        apy: (await getFarmBotAPY(metaFarmBotAddress)).toString(10),
        tvlUSD: (await getMetaLPUSDValueApprox(farmData.zapLPAddress))
          .multipliedBy(await getLPBalance(metaFarmBotAddress))
          .toString(10),
      }
    }
  }
  console.log(JSON.stringify(output))
  res.status(200).send(output)
}

/**
 * Get the APY and TVL of all "base" farm bots. (Excludes meta-farm bots.)
 *
 * NOTE: TVL is given in ethers, not wei
 * NOTE2: APY is given as a fraction, not a percentage
 *
 * @param _req
 * @param res
 */
export const getAllBaseFarmsValue: HttpFunction = async (_req, res) => {
  const output: FarmBotValue = {}
  for (const farmData of FARM_DATA.slice(0, 1)) {
    const farmBotAddress = farmData.FPTokenAddress
    output[farmBotAddress] = {
      apy: (await getFarmBotAPY(farmBotAddress)).toString(10),
      tvlUSD: (await getMetaLPUSDValueApprox(farmData.baseLPAddress))
        .multipliedBy(await getLPBalance(farmBotAddress))
        .toString(10),
    }
  }
  console.log(JSON.stringify(output))
  res.status(200).send(output)
}
