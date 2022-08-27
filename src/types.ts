export interface FarmData {
  zapTokenName: string // the name of the non-FP token in the zap liquidity pool
  FPTokenName: string
  zapLPAddress: string // zap liquidity pool
  baseLPAddress: string // base liquidity pool-- the one farm bot owns LPs in
  zapTokenAddress: string // the non-FP token in the zap-in liquidity pool
  FPTokenAddress: string
  metaFarmBotAddress?: string // farm bot for zap LP tokens (where "base" FP is one one side of the liquidity pool)
  stakingToken0Address: string // staking token 0 (in base liquidity pool)
  stakingToken1Address: string // staking token 1 (in base liquidity pool)
  stakingToken0ToZapToken: string[] // swap path from staking token 0 to zap token
  stakingToken1ToZapToken: string[] // swap path from staking token 1 to zap token
}
