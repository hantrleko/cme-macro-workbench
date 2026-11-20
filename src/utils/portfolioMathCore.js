// Pure ESM Portfolio Optimization (MVO & Risk Parity) + 1,000-Run Monte Carlo Simulation Engine.
// Testable directly with `node --test` and imported into TypeScript/React.

function round2(n) {
  return Math.round(n * 100) / 100;
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

/**
 * Build NxN covariance matrix Sigma from volatilities (%) and correlation matrix
 * Returns covariance in decimal^2 units (e.g., 10% vol -> 0.01 variance)
 */
export function buildCovarianceMatrix(volsPct, corrMatrix) {
  const n = volsPct.length;
  const cov = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const si = volsPct[i] / 100;
      const sj = volsPct[j] / 100;
      const c = i === j ? 1.0 : clamp(corrMatrix[i][j], -0.95, 0.99);
      cov[i][j] = si * sj * c;
    }
  }
  // Small diagonal ridge (1e-6) ensures strict positive definiteness
  for (let i = 0; i < n; i++) {
    cov[i][i] += 1e-6;
  }
  return cov;
}

/**
 * Euclidean projection onto the bounded simplex:
 * { w : sum(w) = 1, 0 <= w_i <= maxW }
 */
function projectOntoBoundedSimplex(v, maxW) {
  const n = v.length;
  const effMax = Math.max(maxW, 1 / n + 0.001);
  // Bisection on Lagrange multiplier theta such that sum(clamp(v_i - theta, 0, effMax)) = 1
  let lo = Math.min(...v) - effMax - 1;
  let hi = Math.max(...v) + 1;
  for (let iter = 0; iter < 50; iter++) {
    const mid = (lo + hi) / 2;
    let s = 0;
    for (let i = 0; i < n; i++) {
      s += clamp(v[i] - mid, 0, effMax);
    }
    if (s > 1) lo = mid;
    else hi = mid;
  }
  const theta = (lo + hi) / 2;
  const w = new Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    w[i] = clamp(v[i] - theta, 0, effMax);
    total += w[i];
  }
  if (total > 0) {
    for (let i = 0; i < n; i++) w[i] /= total;
  } else {
    w.fill(1 / n);
  }
  return w;
}

function matVec(mat, vec) {
  return mat.map((row) => row.reduce((acc, val, j) => acc + val * vec[j], 0));
}

function dot(a, b) {
  return a.reduce((acc, val, i) => acc + val * b[i], 0);
}

/**
 * Projected Gradient Ascent MVO Solver:
 * Maximize w^T mu - (gamma / 2) * w^T Sigma w  s.t. sum(w) = 1, 0 <= w_i <= maxWeight
 */
export function solveMeanVarianceWeights(expectedReturnsPct, covMatrix, riskAversionGamma = 3.5, maxWeight = 0.45) {
  const n = expectedReturnsPct.length;
  const mu = expectedReturnsPct.map((r) => r / 100);
  const gamma = Math.max(riskAversionGamma, 0.25);

  // Estimate Lipschitz constant L = gamma * max_row_sum(Sigma)
  const maxRowSum = Math.max(...covMatrix.map((row) => row.reduce((s, x) => s + Math.abs(x), 0)));
  const stepSize = 0.8 / Math.max(gamma * maxRowSum, 1e-4);

  let w = new Array(n).fill(1 / n);
  for (let iter = 0; iter < 400; iter++) {
    const sigW = matVec(covMatrix, w);
    const grad = mu.map((m, i) => m - gamma * sigW[i]);
    const nextRaw = w.map((wi, i) => wi + stepSize * grad[i]);
    w = projectOntoBoundedSimplex(nextRaw, maxWeight);
  }
  return w;
}

/**
 * Equal Risk Contribution (Risk Parity) Solver via Spinu multiplicative cyclical updates
 */
export function solveRiskParityWeights(covMatrix, maxWeight = 0.45) {
  const n = covMatrix.length;
  // Initialize inverse-volatility weights
  let w = covMatrix.map((row, i) => 1 / Math.sqrt(Math.max(row[i], 1e-6)));
  let sumW = w.reduce((a, b) => a + b, 0);
  w = w.map((x) => x / sumW);

  for (let iter = 0; iter < 250; iter++) {
    const sigW = matVec(covMatrix, w);
    const portVar = Math.max(dot(w, sigW), 1e-8);
    const targetRc = portVar / n;
    const next = new Array(n);
    for (let i = 0; i < n; i++) {
      const rc = Math.max(w[i] * sigW[i], 1e-10);
      next[i] = w[i] * Math.pow(targetRc / rc, 0.35);
    }
    w = projectOntoBoundedSimplex(next, maxWeight);
  }
  return w;
}

/**
 * Cholesky decomposition L such that L * L^T = A (with PSD safeguard)
 */
function choleskyDecomposition(A) {
  const n = A.length;
  const L = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }
      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(A[i][i] - sum, 1e-8));
      } else {
        L[i][j] = (A[i][j] - sum) / Math.max(L[j][j], 1e-8);
      }
    }
  }
  return L;
}

/**
 * Deterministic seeded PRNG (Mulberry32) + Box-Muller standard normal
 */
function createSeededRng(seed = 20261120) {
  let a = seed >>> 0;
  function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function randn() {
    const u1 = Math.max(rand(), 1e-12);
    const u2 = rand();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }
  return { rand, randn };
}

function quantileSorted(sortedArr, q) {
  if (!sortedArr.length) return 100;
  const idx = (sortedArr.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  return sortedArr[lo] * (hi - idx) + sortedArr[hi] * (idx - lo);
}

/**
 * Master Portfolio Optimization & 1,000-Run Monte Carlo Corridor Simulator
 */
export function runPortfolioOptimizationAndMonteCarlo(inputs, engineOutput, options = {}) {
  const mode = options.mode === 'risk-parity' ? 'risk-parity' : 'mvo';
  const riskAversionGamma = options.riskAversionGamma ?? 3.5;
  const maxWeight = clamp(options.maxWeight ?? 0.45, 0.2, 1.0);
  const includePesoJump = options.includePesoJump ?? true;
  const numSimulations = options.numSimulations ?? 1000;

  const assets = engineOutput.assetForecasts;
  const n = assets.length;
  const cashRate = assets.find((a) => a.id === 'us-cash')?.blendedExpectedReturn ?? inputs.actualFedFundsRate;

  // 1. Naive / Unadjusted Inputs (Unconditional Means + Appraisal-Smoothed Reported Vols + Asynchrony-Attenuated Corr)
  const naiveReturns = assets.map((a) => a.unconditionalReturn);
  const naiveVols = assets.map((a) => a.reportedVol);
  const naiveCorr = engineOutput.correlationMatrix.map((row, i) =>
    row.map((c, j) => (i === j ? 1.0 : round2(c * 0.65)))
  );
  const naiveCov = buildCovarianceMatrix(naiveVols, naiveCorr);

  // 2. Calibrated CME Inputs (Blended E(R) + Geltner-Unsmoothed Vols + Regime-Conditioned Corr)
  const calReturns = assets.map((a) => a.blendedExpectedReturn);
  const calVols = assets.map((a) => a.trueUnsmoothedVol);
  const calCov = buildCovarianceMatrix(calVols, engineOutput.correlationMatrix);

  const wNaive =
    mode === 'risk-parity'
      ? solveRiskParityWeights(naiveCov, maxWeight)
      : solveMeanVarianceWeights(naiveReturns, naiveCov, riskAversionGamma, maxWeight);

  const wCal =
    mode === 'risk-parity'
      ? solveRiskParityWeights(calCov, maxWeight)
      : solveMeanVarianceWeights(calReturns, calCov, riskAversionGamma, maxWeight);

  // Portfolio Metrics
  const calSigW = matVec(calCov, wCal);
  const calPortVar = Math.max(dot(wCal, calSigW), 1e-8);
  const calPortVolPct = round2(Math.sqrt(calPortVar) * 100);
  const calPortRet = round2(dot(wCal, calReturns));
  const calRealRet = round2(calPortRet - inputs.expectedInflation);
  const calSharpe = calPortVolPct > 0 ? round2((calPortRet - cashRate) / calPortVolPct) : 0;

  const naiveExpRet = round2(dot(wNaive, naiveReturns));
  const naiveApparentVol = round2(Math.sqrt(Math.max(dot(wNaive, matVec(naiveCov, wNaive)), 1e-8)) * 100);
  const naiveTrueVol = round2(Math.sqrt(Math.max(dot(wNaive, matVec(calCov, wNaive)), 1e-8)) * 100);
  const naiveApparentSharpe = naiveApparentVol > 0 ? round2((naiveExpRet - cashRate) / naiveApparentVol) : 0;
  const naiveTrueSharpe = naiveTrueVol > 0 ? round2((dot(wNaive, calReturns) - cashRate) / naiveTrueVol) : 0;

  const allocations = assets.map((a, i) => {
    const nw = round2(wNaive[i] * 100);
    const cw = round2(wCal[i] * 100);
    const rcPct = round2(((wCal[i] * calSigW[i]) / calPortVar) * 100);
    return {
      id: a.id,
      name: a.name,
      chineseName: a.chineseName,
      naiveWeightPct: nw,
      calibratedWeightPct: cw,
      weightDeltaPct: round2(cw - nw),
      riskContributionPct: rcPct,
    };
  });

  // 3. 1,000-Run Monte Carlo Wealth Corridor over horizonYears (minimum 5 steps for smooth corridor or exact horizon)
  const horizon = inputs.horizonYears;
  const L = choleskyDecomposition(calCov);
  const rng = createSeededRng(20261120);
  const muDec = calReturns.map((r) => r / 100);
  const pesoProb = includePesoJump ? inputs.pesoTailProb : 0;
  // Risky asset tail shock vector (equities/HY/REITs drop sharply, Treasuries rally slightly in flight-to-safety)
  const jumpVector = [-0.005, 0.035, 0.01, -0.04, -0.14, -0.28, -0.18];

  const wealthByYear = Array.from({ length: horizon + 1 }, () => new Array(numSimulations).fill(100));
  const oneYearReturns = new Array(numSimulations);

  for (let s = 0; s < numSimulations; s++) {
    let wealth = 100;
    for (let t = 1; t <= horizon; t++) {
      const z = new Array(n);
      for (let i = 0; i < n; i++) z[i] = rng.randn();

      let portStepRet = 0;
      const isPesoEvent = pesoProb > 0 && rng.rand() < pesoProb;

      for (let i = 0; i < n; i++) {
        let corrShock = 0;
        for (let k = 0; k <= i; k++) corrShock += L[i][k] * z[k];
        const assetRet = muDec[i] + corrShock + (isPesoEvent ? jumpVector[i] : 0);
        portStepRet += wCal[i] * assetRet;
      }

      if (t === 1) oneYearReturns[s] = portStepRet * 100;
      wealth = Math.max(10, wealth * (1 + portStepRet));
      wealthByYear[t][s] = wealth;
    }
  }

  const monteCarloCorridor = [];
  for (let t = 0; t <= horizon; t++) {
    const sorted = [...wealthByYear[t]].sort((a, b) => a - b);
    monteCarloCorridor.push({
      year: t,
      label: t === 0 ? 'T0' : `Y+${t}`,
      p10: round2(quantileSorted(sorted, 0.1)),
      p25: round2(quantileSorted(sorted, 0.25)),
      p50: round2(quantileSorted(sorted, 0.5)),
      p75: round2(quantileSorted(sorted, 0.75)),
      p90: round2(quantileSorted(sorted, 0.9)),
    });
  }

  // VaR 95%, CVaR 95% (1Y horizon) & Probability of Beating Cumulative Inflation
  const sorted1Y = [...oneYearReturns].sort((a, b) => a - b);
  const idx5 = Math.max(1, Math.floor(numSimulations * 0.05));
  const var95 = round2(sorted1Y[idx5]);
  const tailSlice = sorted1Y.slice(0, idx5);
  const cvar95 = round2(tailSlice.reduce((a, b) => a + b, 0) / tailSlice.length);

  const inflationBenchmarkWealth = 100 * Math.pow(1 + inputs.expectedInflation / 100, horizon);
  const terminalWealths = wealthByYear[horizon];
  const beatCount = terminalWealths.filter((w) => w >= inflationBenchmarkWealth).length;
  const probBeatInflation = round2((beatCount / numSimulations) * 100);

  return {
    mode,
    allocations,
    naiveMetrics: {
      expectedReturn: naiveExpRet,
      apparentVol: naiveApparentVol,
      trueVol: naiveTrueVol,
      apparentSharpe: naiveApparentSharpe,
      trueSharpe: naiveTrueSharpe,
    },
    calibratedMetrics: {
      expectedReturn: calPortRet,
      trueVol: calPortVolPct,
      realReturn: calRealRet,
      sharpeRatio: calSharpe,
      var95,
      cvar95,
      probBeatInflation,
    },
    monteCarloCorridor,
  };
}
