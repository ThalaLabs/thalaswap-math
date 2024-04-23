import { EPSILON, MAX_LOOP_LIMIT } from "./constants";

// see `get_Y` in https://github.com/ThalaLabs/thala-modules/blob/main/thalaswap_math/sources/stable_math.move
export function getY(
  xp: number[],
  x: number,
  a: number,
  i: number,
  j: number
): number {
  const d = getD(xp, a);

  const n = xp.length;
  const ann = a * n;

  let c = d;
  let s = 0;

  let k = 0;
  while (k < n) {
    if (k == j) {
      k = k + 1;
      continue;
    }

    let x_k = k == i ? x : xp[k];

    s = s + x_k;
    c = (c * d) / (x_k * n);

    k = k + 1;
  }

  // in the above loop, there's only (n - 1) iterations
  // therefore we add the last iteration that times (d / n), then divided by ann
  c = (c * d) / (ann * n);
  let b = s + d / ann;

  let y = d;
  k = 0;
  while (k < MAX_LOOP_LIMIT) {
    let prev_y = y;
    y = (y * y + c) / (2 * y + b - d);
    if (Math.abs(y - prev_y) < EPSILON) {
      return y;
    }

    k = k + 1;
  }

  throw new Error(
    `not converged in getY, xp: ${xp}, x: ${x}, a: ${a}, i: ${i}, j: ${j}`
  );
}

// see `compute_invarient` in https://github.com/ThalaLabs/thala-modules/blob/main/thalaswap_math/sources/stable_math.move
export function getD(xp: number[], a: number): number {
  const n = xp.length;

  // sum
  const s = xp.reduce((partialSum, a) => partialSum + a, 0);

  if (s == 0) {
    return 0;
  }

  let prev_d: number;
  let d = s;
  const ann = a * n;

  let i = 0;
  while (i < MAX_LOOP_LIMIT) {
    let dp = d;

    let j = 0;
    while (j < n) {
      dp = (dp * d) / (xp[j] * n);
      j = j + 1;
    }

    prev_d = d;
    d = ((ann * s + n * dp) * d) / ((ann - 1) * d + (n + 1) * dp);
    if (Math.abs(prev_d - d) < EPSILON) {
      return d;
    }

    i = i + 1;
  }

  throw new Error(`not converged in getD, xp: ${xp}, a: ${a}`);
}
