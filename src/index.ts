import { HttpFunction } from '@google-cloud/functions-framework/build/src/functions'
import { BigNumber } from 'bignumber.js'
import { FARM_DATA, mcUSD_ADDRESS_MAINNET } from './constants'
import { FarmBotValue } from './types'
import FARM_BOT_ABI from './abis/FarmBot.json'
import ERC20_ABI from './abis/ERC20.json'
import { ethers } from 'ethers'
import Logger from './log'

const RPC_URL = 'https://forno.celo.org'

const SECONDS_PER_BLOCK = 5
const SECONDS_PER_DAY = 24 * 60 * 60
const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365
const BLOCKS_PER_DAY = SECONDS_PER_DAY / SECONDS_PER_BLOCK

const rpcProvider = new ethers.providers.JsonRpcProvider(RPC_URL)
const mcUSDContract = new ethers.Contract(
  mcUSD_ADDRESS_MAINNET,
  ERC20_ABI,
  rpcProvider,
)

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
  return new BigNumber(farmBotLPBalance.toString())
}

/**
 * Get the approximate TVL of a "base" (not meta) farm bot in USD.
 *
 * NOTE: assumes meta-LP has mcUSD on one side of the pool!!
 * NOTE2: "approx" because the LP is not guaranteed to be balanced (assumes arbitrage is working its magic)
 *
 * @param zapLPAddress
 * @param farmBotAddress
 */
async function getBaseFarmBotTVLApprox({
  zapLPAddress,
}: {
  zapLPAddress: string
}): Promise<string> {
  const zapLPTVLWei = (await mcUSDContract.balanceOf(zapLPAddress)).toString()
  return ethers.utils.formatEther(zapLPTVLWei)
}

/**
 * Get the approximate TVL of a "meta" farm bot (a farm bot on a liquidity pool that includes a farm bot).
 *
 * @param zapLPAddress: liquidity pool with the "base" farm bot in it
 * @param metaFarmBotAddress: address of the meta-farm bot
 */
async function getMetaFarmBotTVLApprox({
  zapLPAddress,
  metaFarmBotAddress,
}: {
  zapLPAddress: string
  metaFarmBotAddress: string
}): Promise<string> {
  const mcUSDInPool = new BigNumber(
    (await mcUSDContract.balanceOf(zapLPAddress)).toString(),
  )
  const lpContract = new ethers.Contract(zapLPAddress, ERC20_ABI, rpcProvider)
  const lpTotalSupply = (await lpContract.totalSupply()).toString()
  const USDPerLP = mcUSDInPool
    .multipliedBy(2) // account for approx value of RFP in pool, if arbitrage working
    .dividedBy(lpTotalSupply)
  const tvlWei = USDPerLP.multipliedBy(
    await getLPBalance(metaFarmBotAddress),
  ).toString()
  return ethers.utils.formatEther(tvlWei)
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
    Logger.error('Not enough compound events found, returning 0')
    return new BigNumber(0)
  }
  const [prevCompoundEvent, curCompoundEvent] = compoundEventsThisWeek
    .sort((eventA, eventB) => eventA.blockNumber - eventB.blockNumber) // ascending by block number
    .slice(-2)
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
    .div(compoundTimesApprox)
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
        apy: (await getFarmBotAPY(metaFarmBotAddress)).toString(),
        tvlUSD: await getMetaFarmBotTVLApprox({
          metaFarmBotAddress: metaFarmBotAddress,
          zapLPAddress: farmData.zapLPAddress,
        }),
      }
    }
  }
  Logger.debug('output: ' + JSON.stringify(output))
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
  for (const farmData of FARM_DATA) {
    const farmBotAddress = farmData.FPTokenAddress
    output[farmBotAddress] = {
      apy: (await getFarmBotAPY(farmBotAddress)).toString(10),
      tvlUSD: await getBaseFarmBotTVLApprox({
        zapLPAddress: farmData.zapLPAddress,
      }),
    }
  }
  Logger.debug('output: ' + JSON.stringify(output))
  res.status(200).send(output)
}
