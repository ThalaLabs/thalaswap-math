import { getD, getY } from "./internal/utils";

export function calcOutGivenInStable(
  amountIn: number,
  indexIn: number,
  indexOut: number,
  balances: number[],
  amp: number,
  fee: number
): number {
  amountIn = amountIn * (1 - fee);
  const newX = balances[indexIn] + amountIn; // x is input
  const newY = getY(balances, newX, amp, indexIn, indexOut);
  return balances[indexOut] - newY;
}

export function calcInGivenOutStable(
  amountOut: number,
  indexIn: number,
  indexOut: number,
  balances: number[],
  amp: number,
  fee: number
): number {
  const newX = balances[indexOut] - amountOut; // x is output
  const newY = getY(balances, newX, amp, indexOut, indexIn);
  return (newY - balances[indexIn]) / (1 - fee);
}

// get relative price of coin j to i
// formula: https://linear.app/thala-labs/issue/THA-434/calculate-swap-price-impact
export function getPriceStable(
  i: number,
  j: number,
  balances: number[],
  amp: number
): number {
  const d = getD(balances, amp);
  const n = balances.length;
  let b = Math.pow(d, n + 1) / Math.pow(n, n);
  balances.forEach((x: number, index: number) => {
    if (index != i && index != j) {
      b = b / x;
    }
  });
  let naxx = n * amp * balances[i] * balances[i] * balances[j] * balances[j];
  return (balances[i] * b + naxx) / (balances[j] * b + naxx);
}

export function calcPriceImpactPercentageStable(
  exactAmountIn: number,
  exactAmountOut: number,
  indexIn: number,
  indexOut: number,
  balances: number[],
  amp: number
): number {
  if (balances[indexOut] - exactAmountOut < 0.000001) {
    // to avoid loss of accuracy, we just return 100%
    return 100;
  }
  const oldPrice = getPriceStable(indexIn, indexOut, balances, amp);

  // update new balance
  balances[indexIn] = balances[indexIn] + exactAmountIn;
  balances[indexOut] = balances[indexOut] - exactAmountOut;
  const newPrice = getPriceStable(indexIn, indexOut, balances, amp);
  return (Math.abs(newPrice - oldPrice) / oldPrice) * 100;
}

/*
Why is there a slippage loss?
Example: an extreme case of stable pool D = sqrt(xy)
Before adding LP, the pool is 100 X + 100 Y, fair price of Y (relative to X) is 1
After adding 300 X + 0 Y, the pool is 400 X + 100 Y, user's share of the pool is 50%
Because liquidity is added not evenly, the pool will be arbed to 200 X + 200 Y (fair price of Y to X should stay 1)
When the user removes LP, the funds become 100 X + 100Y, therefore the users suffers a slippage loss of 33.3% (100/300)
*/
export function getStableSwapSlippageLoss(
  inputAmounts: number[],
  poolBalances: number[],
  amp: number
): number {
  const d = getD(poolBalances, amp);
  const relativePrices = Array(poolBalances.length)
    .fill(0)
    .map((_, i) =>
      i == 0 ? 1 : getPriceStableWithKnownD(0, i, poolBalances, amp, d)
    );
  const prevWorth = inputAmounts.reduce(
    (acc, cur, i) => acc + cur * relativePrices[i],
    0
  );
  const newBalances = poolBalances.map(
    (balance, i) => balance + inputAmounts[i]
  );
  const newD = getD(newBalances, amp);
  const newWorth =
    (poolBalances.reduce((acc, cur, i) => acc + cur * relativePrices[i], 0) *
      (newD - d)) /
    d;
  return (prevWorth - newWorth) / prevWorth;
}

export function getLpTokenToIssueStable(
  inputAmounts: number[],
  poolBalances: number[],
  amp: number,
  lpSupply: number
): number {
  const d = getD(poolBalances, amp);
  const newPoolBalances = poolBalances.map(
    (balance, i) => balance + inputAmounts[i]
  );
  const newD = getD(newPoolBalances, amp);
  return (lpSupply * (newD - d)) / d;
}

// same as getPriceStable, but with known D (invariant)
function getPriceStableWithKnownD(
  i: number,
  j: number,
  balances: number[],
  amp: number,
  d: number
): number {
  const n = balances.length;
  let b = Math.pow(d, n + 1) / Math.pow(n, n);
  balances.forEach((x: number, index: number) => {
    if (index != i && index != j) {
      b = b / x;
    }
  });
  let naxx = n * amp * balances[i] * balances[i] * balances[j] * balances[j];
  return (balances[i] * b + naxx) / (balances[j] * b + naxx);
}
