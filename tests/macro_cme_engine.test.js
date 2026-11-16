import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTrendGrowthAndEquityAnchor,
  calculateTaylorRuleAndPolicyMix,
  calculateBiasAndUnsmoothing,
  calculateInternationalLinkages,
  runFullMacroCmeSimulation,
} from '../src/utils/macroMathCore.js';

const BASELINE_INPUTS = {
  shrinkageLambda: 0.7,
  appraisalSmoothingAlpha: 0.4,
  pesoTailProb: 0.03,
  sampleWindowId: 'full-1970-2025',
  usePointInTimeData: true,

  laborForceGrowth: 0.6,
  laborParticipationDelta: 0.0,
  capitalDeepening: 0.9,
  tfpGrowth: 1.2,
  profitShareDeltaAnnual: 0.0,
  peReRatingAnnual: 0.0,
  dividendYield: 1.5,
  netBuybackYield: 1.5,
  shockSource: 'financial-crisis',
  shockTrajectoryType: 'type3-hysteresis',
  shockMagnitude: 4.0,

  cyclePhase: 'late-expansion',
  inflationScenario: 'normal-procyclical',
  modelWeights: { econometric: 0.4, leiNowcast: 0.35, checklist: 0.25 },
  checklistScores: {
    ismManufacturingPmi: 0.5,
    initialJoblessClaims: 0.5,
    seniorLoanOfficerTightening: -0.5,
    copperGoldRatio: 0.5,
    corporateProfitMargins: 0.0,
    consumerConfidenceSpread: -0.5,
  },

  neutralRealRate: 1.25,
  targetInflation: 2.0,
  expectedInflation: 3.0,
  outputGap: 1.2,
  actualFedFundsRate: 4.5,
  fiscalStance: 'loose',
  monetaryStance: 'tight',
  fiscalDeficitPctGdp: 6.0,
  govDebtPctGdp: 120.0,
  qeActive: false,
  zirpNirpMode: false,
  cashFrictionThreshold: -0.75,
  ldiPensionDemand: false,

  privateSavingPctGdp: 18.0,
  privateInvestmentPctGdp: 15.0,
  foreignRealYield: 0.8,
  fxRegime: 'floating',
  pppDeviationInitial: 10.0,
  horizonYears: 5,
};

test('US Macro & CME Engine Unit Tests', async (t) => {
  await t.test('Taylor Rule exact formula matches Image 7 specification', () => {
    const growth = calculateTrendGrowthAndEquityAnchor(BASELINE_INPUTS);
    const policy = calculateTaylorRuleAndPolicyMix(BASELINE_INPUTS, growth);
    // r_neutral (1.25) + pi_e (3.0) + 0.5*(1.2) + 0.5*(3.0 - 2.0) = 1.25 + 3.0 + 0.6 + 0.5 = 5.35
    assert.equal(policy.taylorImpliedRate, 5.35);
    assert.equal(policy.policyGapBps, -85);
  });

  await t.test('National Income Identity balances (X-M) = (S-I) + (T-G) and Mirror Image CA = -KA', () => {
    const intl = calculateInternationalLinkages(BASELINE_INPUTS, 4.4);
    // S - I = 18.0 - 15.0 = 3.0; T - G = -6.0; X - M = -3.0; Capital Account = +3.0
    assert.equal(intl.netPrivateSavingPctGdp, 3.0);
    assert.equal(intl.fiscalBalancePctGdp, -6.0);
    assert.equal(intl.currentAccountPctGdp, -3.0);
    assert.equal(intl.capitalAccountPctGdp, 3.0);
    assert.equal(
      Number((intl.currentAccountPctGdp + intl.capitalAccountPctGdp).toFixed(4)),
      0
    );
  });

  await t.test('Geltner appraisal unsmoothing scales volatility inversely with alpha', () => {
    const smoothedBias = calculateBiasAndUnsmoothing({
      ...BASELINE_INPUTS,
      appraisalSmoothingAlpha: 0.4,
    });
    const unsmoothedBias = calculateBiasAndUnsmoothing({
      ...BASELINE_INPUTS,
      appraisalSmoothingAlpha: 1.0,
    });

    assert.ok(
      smoothedBias.unsmoothedReitVol > smoothedBias.rawReitVol,
      'Alpha < 1 must inflate true unsmoothed volatility above reported vol'
    );
    assert.equal(
      unsmoothedBias.unsmoothedReitVol,
      unsmoothedBias.rawReitVol,
      'Alpha = 1 means no smoothing distortion'
    );
  });

  await t.test('Exogenous shock trajectories satisfy Y_baseline(10) > Y_type1(10) > Y_type3(10)', () => {
    const growth = calculateTrendGrowthAndEquityAnchor(BASELINE_INPUTS);
    const year10 = growth.gdpTrajectory[10];
    assert.equal(year10.year, 10);
    assert.ok(
      year10.baselineTrend > year10.type1LevelDrop,
      `Expected baseline (${year10.baselineTrend}) > type1 (${year10.type1LevelDrop})`
    );
    assert.ok(
      year10.type1LevelDrop > year10.type3Hysteresis,
      `Expected type1 (${year10.type1LevelDrop}) > type3 (${year10.type3Hysteresis})`
    );
    assert.ok(
      year10.baselineTrend > year10.type2SlopeDrop && year10.type2SlopeDrop > year10.type3Hysteresis,
      `Expected baseline > type2 > type3`
    );
  });

  await t.test('2x2 Policy Mix Matrix yields higher nominal rates under Loose+Loose than Tight+Tight', () => {
    const looseLooseOut = runFullMacroCmeSimulation({
      ...BASELINE_INPUTS,
      fiscalStance: 'loose',
      monetaryStance: 'loose',
    });
    const tightTightOut = runFullMacroCmeSimulation({
      ...BASELINE_INPUTS,
      fiscalStance: 'tight',
      monetaryStance: 'tight',
    });

    const loose10Y = looseLooseOut.policy.yieldCurve.find((p) => p.tenor === '10Y').simulatedYield;
    const tight10Y = tightTightOut.policy.yieldCurve.find((p) => p.tenor === '10Y').simulatedYield;
    assert.ok(
      loose10Y > tight10Y,
      `Expected Loose Fiscal + Loose Monetary 10Y (${loose10Y}%) > Tight + Tight (${tight10Y}%)`
    );
    assert.equal(looseLooseOut.assetForecasts.length, 7);
    assert.equal(looseLooseOut.correlationMatrix.length, 7);
  });
});
