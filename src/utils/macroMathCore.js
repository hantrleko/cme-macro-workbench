// Pure mathematical simulation kernel for US Macro & Capital Market Expectations (CME).
// Designed as pure ESM JavaScript so both Vite/TypeScript and `node --test` execute the exact same code.

export const SAMPLE_WINDOW_STATS = {
  'full-1970-2025': {
    label: '全样本期 (1970–2025, 完整多体制周期)',
    equitiesMean: 10.4,
    bondsMean: 6.2,
    cashMean: 4.3,
    tipsMean: 5.1,
    igMean: 7.0,
    hyMean: 8.6,
    reitMean: 9.2,
    regimeBreakNote: '横跨70年代大滞胀、80-07大缓和、09-21零利率QE与22-26再通胀四次体制变革。',
  },
  'great-moderation-1985-2007': {
    label: '大缓和时期 (1985–2007, 利率单边下行红利)',
    equitiesMean: 12.1,
    bondsMean: 7.9,
    cashMean: 4.8,
    tipsMean: 6.4,
    igMean: 8.5,
    hyMean: 9.8,
    reitMean: 11.4,
    regimeBreakNote: '债券享受长达20余年的估值资本利得，直接外推会系统性高估未来债券回报（时间跨度偏差）。',
  },
  'post-gfc-zirp-2009-2021': {
    label: '后GFC零利率QE期 (2009–2021, 股债负相关红利)',
    equitiesMean: 14.8,
    bondsMean: 3.4,
    cashMean: 0.6,
    tipsMean: 3.9,
    igMean: 4.9,
    hyMean: 7.8,
    reitMean: 11.8,
    regimeBreakNote: '低通胀+QE造就美股历史级估值扩张与负股债相关性，在正通胀冲击下模型立即失效（图8原则#2）。',
  },
  'stagflation-1970-1982': {
    label: '大滞胀周期 (1970–1982, 供给冲击与股债双杀)',
    equitiesMean: 6.8,
    bondsMean: 5.5,
    cashMean: 7.8,
    tipsMean: 7.2,
    igMean: 6.1,
    hyMean: 6.4,
    reitMean: 8.9,
    regimeBreakNote: '名义债券真实购买力受损，现金与实物资产跑赢，高波动贴现率持续压制股市PE倍数。',
  },
};

export const ASSET_CLASS_METADATA = [
  { id: 'us-cash', name: 'US Cash (3M T-Bill)', chineseName: '美国现金/3M国库券', category: 'Cash', baseVol: 1.1 },
  { id: 'us-10y-treasury', name: 'US 10Y Treasury', chineseName: '美国10年期名义国债', category: 'Fixed Income', baseVol: 7.8 },
  { id: 'us-tips', name: 'US TIPS (Inflation-Linked)', chineseName: '美国通胀保值国债 (TIPS)', category: 'Fixed Income', baseVol: 6.4 },
  { id: 'us-ig-corp', name: 'US IG Corporate', chineseName: '美国投资级公司债 (IG)', category: 'Fixed Income', baseVol: 8.6 },
  { id: 'us-high-yield', name: 'US High Yield', chineseName: '美国高收益信用债 (HY)', category: 'Fixed Income', baseVol: 11.2 },
  { id: 'us-equities', name: 'US Large-Cap Equities (S&P 500)', chineseName: '美国大盘股 (S&P 500)', category: 'Equities', baseVol: 16.5 },
  { id: 'us-reits', name: 'US Core Real Estate / REITs', chineseName: '美国核心商业地产 / REITs', category: 'Real Assets', baseVol: 6.8 },
];

function round2(n) {
  return Math.round(n * 100) / 100;
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

/**
 * Image 3 & Image 11: GDP Decomposition, Equity Anchor (V_e = GDP * S_k * PE) & Exogenous Shock Paths
 */
export function calculateTrendGrowthAndEquityAnchor(inputs) {
  const laborContribution = round2(inputs.laborForceGrowth + inputs.laborParticipationDelta);
  const productivityContribution = round2(inputs.capitalDeepening + inputs.tfpGrowth);
  const realTrendGdp = round2(laborContribution + productivityContribution);

  const mag = Math.max(0, Number(inputs.shockMagnitude) || 0);
  const slopePenalty =
    inputs.shockSource === 'tech-ai' && inputs.shockTrajectoryType === 'none'
      ? 0
      : round2(mag * 0.25);

  let shockAdjustedRealGdp = realTrendGdp;
  if (inputs.shockTrajectoryType === 'type2-slope-drop' || inputs.shockTrajectoryType === 'type3-hysteresis') {
    shockAdjustedRealGdp = round2(realTrendGdp - slopePenalty);
  }
  const nominalTrendGdp = round2(shockAdjustedRealGdp + inputs.expectedInflation);

  // Build 10-year cumulative GDP index paths (t = 0..10, base = 100)
  const gBase = realTrendGdp / 100;
  const gLowerSlope = (realTrendGdp - slopePenalty) / 100;
  const levelDropFactor = 1 - mag / 100;

  const gdpTrajectory = [];
  for (let t = 0; t <= 10; t++) {
    const baselineTrend = round2(100 * Math.pow(1 + gBase, t));
    const type1LevelDrop =
      t === 0
        ? 100
        : round2(100 * levelDropFactor * Math.pow(1 + gBase, t - 1) * (1 + gBase));
    // Simplified clean mathematical form:
    // Type 1: drops immediately at t>=1 by levelDropFactor, grows at gBase thereafter
    const type1Clean = t === 0 ? 100 : round2(baselineTrend * levelDropFactor);
    // Type 2: no initial drop at t=1 level shock, grows at reduced slope gLowerSlope
    const type2SlopeDrop = round2(100 * Math.pow(1 + gLowerSlope, t));
    // Type 3: drops by levelDropFactor AND grows at gLowerSlope
    const type3Hysteresis = t === 0 ? 100 : round2(type2SlopeDrop * levelDropFactor);

    let activePath = baselineTrend;
    if (inputs.shockTrajectoryType === 'type1-level-drop') activePath = type1Clean;
    else if (inputs.shockTrajectoryType === 'type2-slope-drop') activePath = type2SlopeDrop;
    else if (inputs.shockTrajectoryType === 'type3-hysteresis') activePath = type3Hysteresis;

    void type1LevelDrop;
    gdpTrajectory.push({
      year: t,
      label: t === 0 ? 'T0' : `Y+${t}`,
      baselineTrend,
      type1LevelDrop: type1Clean,
      type2SlopeDrop,
      type3Hysteresis,
      activePath,
    });
  }

  // Equity Anchor: V_e = GDP * S_k * PE => ΔV_e/V_e ≈ ΔGDP_nom + ΔS_k + ΔPE + Income Yield
  // Note: Horizon decay on valuation re-rating (P/E mean reversion cannot expand infinitely - Image 3)
  const horizonDampening = inputs.horizonYears === 10 ? 0.65 : inputs.horizonYears === 5 ? 0.85 : 1.0;
  const nominalGdpContrib = round2(nominalTrendGdp);
  const profitShareContrib = round2(inputs.profitShareDeltaAnnual * horizonDampening);
  const valuationContrib = round2(inputs.peReRatingAnnual * horizonDampening);
  const incomeYieldContrib = round2(inputs.dividendYield + inputs.netBuybackYield);
  const totalExpectedEquityReturn = round2(
    nominalGdpContrib + profitShareContrib + valuationContrib + incomeYieldContrib
  );

  const highGrowthTrapWarning =
    shockAdjustedRealGdp >= 2.8 && (valuationContrib < -0.3 || profitShareContrib < -0.2);
  const highGrowthTrapReason = highGrowthTrapWarning
    ? `高趋势增长 (${shockAdjustedRealGdp.toFixed(2)}%) 已被高估值提前定价或引发资本深化稀释，ΔS_k (${profitShareContrib}%) 与 ΔPE (${valuationContrib}%) 产生负向拖累。`
    : '经济增长、资本利润份额 (S_k) 与估值倍数处于均衡一致状态。';

  return {
    laborContribution,
    productivityContribution,
    realTrendGdp,
    shockAdjustedRealGdp,
    nominalTrendGdp,
    gdpTrajectory,
    equityAnchorBreakdown: {
      nominalGdpContrib,
      profitShareContrib,
      valuationContrib,
      incomeYieldContrib,
      totalExpectedEquityReturn,
      highGrowthTrapWarning,
      highGrowthTrapReason,
    },
  };
}

/**
 * Image 7, Image 8 & Image 9: Taylor Rule, ZIRP/NIRP/QE, 2x2 Policy Mix & US Treasury Yield Curve
 */
export function calculateTaylorRuleAndPolicyMix(inputs, growthInfo) {
  // Exact Taylor Rule from Image 7:
  // i* = r_neutral + pi_e + 0.5*(Y_e - Y_trend) + 0.5*(pi_e - pi_target)
  const taylorImpliedRate = round2(
    inputs.neutralRealRate +
      inputs.expectedInflation +
      0.5 * inputs.outputGap +
      0.5 * (inputs.expectedInflation - inputs.targetInflation)
  );

  const policyGapBps = Math.round((inputs.actualFedFundsRate - taylorImpliedRate) * 100);
  let policyBiasLabel = '中性合意 (Neutral Fit)';
  if (policyGapBps <= -75) policyBiasLabel = '过度宽松 (Behind the Curve)';
  else if (policyGapBps >= 75) policyBiasLabel = '过度紧缩 (Over-tightening Risk)';

  const stringAsymmetryState =
    inputs.monetaryStance === 'tight'
      ? '拉绳子 (Pulling on a String)：紧缩政策对抑制过热非常有效，但受长且多变的时滞影响存在过度紧缩引发衰退风险。'
      : '推绳子 (Pushing on a String)：宽松货币在资产负债表衰退/ZLB期间难以单靠降息强迫私营部门扩张信贷与复苏。';

  // 2x2 Policy Mix Matrix (Image 9)
  let policyMixQuadrant = '';
  let realRateLevelLabel = '';
  let inflationPressureLabel = '';
  let nominalRateLevelLabel = '';
  let mixRealRateShift = 0;
  let mixInflationShift = 0;

  if (inputs.fiscalStance === 'loose' && inputs.monetaryStance === 'loose') {
    policyMixQuadrant = '双松政策 (Loose Fiscal + Loose Monetary)';
    realRateLevelLabel = '高实际利率倾向 (财政挤出效应)';
    inflationPressureLabel = '高通胀预期';
    nominalRateLevelLabel = '高名义利率';
    mixRealRateShift = 0.65;
    mixInflationShift = 0.85;
  } else if (inputs.fiscalStance === 'tight' && inputs.monetaryStance === 'loose') {
    policyMixQuadrant = '紧财松币 (Tight Fiscal + Loose Monetary)';
    realRateLevelLabel = '低实际利率';
    inflationPressureLabel = '高通胀预期';
    nominalRateLevelLabel = '中等名义利率';
    mixRealRateShift = -0.55;
    mixInflationShift = 0.55;
  } else if (inputs.fiscalStance === 'loose' && inputs.monetaryStance === 'tight') {
    policyMixQuadrant = '松财紧币 (Loose Fiscal + Tight Monetary)';
    realRateLevelLabel = '高实际利率 (强劲需求+紧缩货币)';
    inflationPressureLabel = '受压制的低通胀预期';
    nominalRateLevelLabel = '中等名义利率';
    mixRealRateShift = 0.85;
    mixInflationShift = -0.35;
  } else {
    policyMixQuadrant = '双紧政策 (Tight Fiscal + Tight Monetary)';
    realRateLevelLabel = '低实际利率';
    inflationPressureLabel = '低通胀预期';
    nominalRateLevelLabel = '低名义利率';
    mixRealRateShift = -0.55;
    mixInflationShift = -0.65;
  }

  // ZIRP / NIRP ZLB breach check (Image 8)
  const effectiveShortRate = inputs.zirpNirpMode
    ? Math.max(inputs.actualFedFundsRate, inputs.cashFrictionThreshold)
    : inputs.actualFedFundsRate;
  const zlbBreachFeasible = taylorImpliedRate >= inputs.cashFrictionThreshold;
  const cmeZirpAnchorRate = round2(inputs.neutralRealRate + inputs.expectedInflation);

  // Debt Spiral & Politicization Risk (Image 9)
  const debtExcess = Math.max(0, inputs.govDebtPctGdp - 80);
  const deficitExcess = Math.max(0, inputs.fiscalDeficitPctGdp - 3.0);
  const debtSpiralRiskScore = Math.round(clamp(debtExcess * 0.75 + deficitExcess * 7.5, 0, 100));
  let debtSpiralRiskLabel = '可控 (Contained)';
  if (debtSpiralRiskScore >= 65) {
    debtSpiralRiskLabel = '高危政治化风险 (Politicization & Inflating Debt Risk)';
  } else if (debtSpiralRiskScore >= 38) {
    debtSpiralRiskLabel = '警戒 (Elevated)';
  }

  // Cycle Curve Shape Modifiers (Image 5 & Image 9)
  const cycleSlopeMap = {
    'initial-recovery': { label: '陡峭化 (Steepening — 初期复苏长端先行筑底)', slope2s10sBase: 1.55, shortAdj: -0.25 },
    'early-expansion': { label: '逐步平坦化 (Flattening — 撤回宽松短端抬升)', slope2s10sBase: 0.90, shortAdj: 0.15 },
    'late-expansion': { label: '显著平坦化 (Late Flattening — 限制性利率逼近)', slope2s10sBase: 0.20, shortAdj: 0.45 },
    'slowdown': { label: '平坦或倒挂 (Flat to Inverted — 加息见顶衰退预警)', slope2s10sBase: -0.55, shortAdj: 0.55 },
    'contraction': { label: '牛市陡峭化 (Bull Steepening — 降息预期短端骤降)', slope2s10sBase: 1.25, shortAdj: -0.75 },
  };

  const cycleShape = cycleSlopeMap[inputs.cyclePhase] || cycleSlopeMap['late-expansion'];
  const tenors = [
    { tenor: '3M', years: 0.25 },
    { tenor: '1Y', years: 1 },
    { tenor: '2Y', years: 2 },
    { tenor: '5Y', years: 5 },
    { tenor: '10Y', years: 10 },
    { tenor: '20Y', years: 20 },
    { tenor: '30Y', years: 30 },
  ];

  // Long-run neutral nominal equilibrium anchor (Image 3 & Image 8)
  const longRunNominalAnchor =
    0.5 * (growthInfo.nominalTrendGdp * 0.85) +
    0.5 * (inputs.neutralRealRate + inputs.expectedInflation + 0.5) +
    mixRealRateShift * 0.45 +
    mixInflationShift * 0.45;

  const politicizationSteepening = debtSpiralRiskScore >= 55 ? (debtSpiralRiskScore - 55) * 0.015 : 0;

  const yieldCurve = tenors.map(({ tenor, years }) => {
    const shortEnd = effectiveShortRate;
    const weightLong = 1 - Math.exp(-years / 3.2);

    // Cycle benchmark curve
    const cycleAnchor10Y = shortEnd + cycleShape.slope2s10sBase + (years >= 10 ? (years - 10) * 0.025 : 0);
    const cycleBenchmarkYield = round2(
      clamp(shortEnd * (1 - weightLong) + (longRunNominalAnchor * 0.4 + cycleAnchor10Y * 0.6) * weightLong, -1.0, 14.0)
    );

    // Counterfactual without QE/LDI
    const termPremiumAdj = (years / 10) * (cycleShape.slope2s10sBase * 0.45) + politicizationSteepening * clamp(years / 10, 0, 1.5);
    const noQeBase =
      shortEnd * (1 - weightLong) +
      (longRunNominalAnchor + (mixRealRateShift + mixInflationShift) * 0.35 + termPremiumAdj) * weightLong;
    const noQeCounterfactualYield = round2(clamp(noQeBase, -1.0, 14.0));

    // Apply QE Flow/Stock compression & LDI ultra-long demand
    let qeCompression = 0;
    if (inputs.qeActive && years >= 2) {
      qeCompression = -0.75 * Math.sin(Math.min(years / 15, 1) * (Math.PI / 2));
    }
    let ldiCompression = 0;
    if (inputs.ldiPensionDemand && years >= 15) {
      ldiCompression = years === 30 ? -0.45 : -0.28;
    }

    const simulatedYield = round2(
      clamp(
        0.55 * noQeCounterfactualYield + 0.45 * cycleBenchmarkYield + qeCompression + ldiCompression,
        inputs.cashFrictionThreshold,
        14.0
      )
    );

    return {
      tenor,
      years,
      simulatedYield,
      cycleBenchmarkYield,
      noQeCounterfactualYield,
    };
  });

  const y3m = yieldCurve.find((p) => p.tenor === '3M')?.simulatedYield ?? effectiveShortRate;
  const y2y = yieldCurve.find((p) => p.tenor === '2Y')?.simulatedYield ?? effectiveShortRate;
  const y10y = yieldCurve.find((p) => p.tenor === '10Y')?.simulatedYield ?? effectiveShortRate;
  const slope10Y2Y = round2(y10y - y2y);
  const slope10Y3M = round2(y10y - y3m);

  let curveShapeLabel = cycleShape.label;
  if (slope10Y2Y < -0.15) curveShapeLabel = `曲线倒挂 (${slope10Y2Y.toFixed(2)}%) — 紧缩与衰退滞后信号`;
  else if (slope10Y2Y > 1.1) curveShapeLabel = `曲线陡峭 (+${slope10Y2Y.toFixed(2)}%) — 复苏或财政通胀溢价`;

  return {
    taylorImpliedRate,
    policyGapBps,
    policyBiasLabel,
    stringAsymmetryState,
    policyMixQuadrant,
    realRateLevelLabel,
    inflationPressureLabel,
    nominalRateLevelLabel,
    debtSpiralRiskScore,
    debtSpiralRiskLabel,
    zlbBreachFeasible,
    cmeZirpAnchorRate,
    yieldCurve,
    slope10Y2Y,
    slope10Y3M,
    curveShapeLabel,
  };
}

/**
 * Image 1: Data Biases, Geltner Appraisal Unsmoothing & Conditioning Shrinkage
 */
export function calculateBiasAndUnsmoothing(inputs) {
  const windowMeta = SAMPLE_WINDOW_STATS[inputs.sampleWindowId] || SAMPLE_WINDOW_STATS['full-1970-2025'];
  const rawReitVol = 6.8;
  const alpha = clamp(inputs.appraisalSmoothingAlpha, 0.15, 1.0);
  // Geltner exact AR(1) unsmoothing: sigma_true = sigma_obs * sqrt((2 - alpha) / alpha)
  const unsmoothedReitVol = round2(rawReitVol * Math.sqrt((2 - alpha) / alpha));
  const smoothingVolUnderstatementPct = round2(((unsmoothedReitVol - rawReitVol) / unsmoothedReitVol) * 100);

  // Vintage PIT vs Revised Look-Ahead Bias
  const pitVsRevisedGdpErrorBps = inputs.usePointInTimeData ? 0 : 68; // ~68 bps look-ahead illusion when using revised data

  // Peso problem annual tail drag
  const pesoAnnualDragPct = round2(inputs.pesoTailProb * 35.0);

  // Asynchronous vs Synchronized Equity-Bond Correlation
  const baseCorr = inputs.inflationScenario === 'high-inflation-surprise' ? 0.42 : -0.22;
  const asyncReported = round2(baseCorr * 0.58); // Asynchrony attenuates contemporaneous correlation

  return {
    sampleWindowLabel: windowMeta.label,
    sampleWindowEquitiesMean: windowMeta.equitiesMean,
    sampleWindowBondsMean: windowMeta.bondsMean,
    rawReitVol,
    unsmoothedReitVol,
    smoothingVolUnderstatementPct,
    pitVsRevisedGdpErrorBps,
    pesoAnnualDragPct,
    asyncVsSyncedEquityBondCorr: {
      asyncReported,
      trueSynced: round2(baseCorr),
    },
  };
}

/**
 * Image 10: National Income Identity (X-M) = (S-I) + (T-G) & Dornbusch FX Overshooting
 */
export function calculateInternationalLinkages(inputs, yieldCurve10Y) {
  const netPrivateSavingPctGdp = round2(inputs.privateSavingPctGdp - inputs.privateInvestmentPctGdp);
  const fiscalBalancePctGdp = round2(-inputs.fiscalDeficitPctGdp); // T - G = -(G - T)
  const currentAccountPctGdp = round2(netPrivateSavingPctGdp + fiscalBalancePctGdp);
  const capitalAccountPctGdp = round2(-currentAccountPctGdp); // Exact Mirror Image

  const usRealYield10Y = round2(yieldCurve10Y - inputs.expectedInflation);
  const realYieldSpreadVsForeign = round2(usRealYield10Y - inputs.foreignRealYield);

  // Dornbusch Overshooting: higher US real rate induces immediate spot appreciation above PPP
  // so expected subsequent depreciation balances the yield advantage
  const fxOvershootInitialPct =
    inputs.fxRegime === 'credibly-fixed'
      ? 0
      : round2(realYieldSpreadVsForeign * 3.8 + inputs.pppDeviationInitial * 0.45);

  const fxOvershootPath = [];
  for (let q = 0; q <= 20; q++) {
    const decay = Math.exp(-q / 7.5);
    const spotDeviation =
      inputs.fxRegime === 'credibly-fixed'
        ? 0
        : inputs.fxRegime === 'pegged-fragile' && q >= 12
        ? -14.5 // Devaluation risk jump
        : round2(fxOvershootInitialPct * decay);
    fxOvershootPath.push({
      quarter: q,
      label: `Q${q}`,
      spotIndex: round2(100 + spotDeviation),
      pppEquilibrium: 100,
      realRateDifferential: round2(realYieldSpreadVsForeign * decay),
    });
  }

  let grexitStyleInversionRisk = '低风险 (浮动汇率吸纳外部冲击)';
  if (inputs.fxRegime === 'pegged-fragile') {
    grexitStyleInversionRisk = '极高风险：脆弱盯住汇率制下，贬值退出预期会令短端信用利差急剧飙升并触发曲线倒挂（图10 Grexit机制）。';
  } else if (inputs.fxRegime === 'credibly-fixed') {
    grexitStyleInversionRisk = '受控条件：仅在资本完全自由流动且汇率永久可信固定时才可共享无风险收益率曲线。';
  }

  return {
    netPrivateSavingPctGdp,
    fiscalBalancePctGdp,
    currentAccountPctGdp,
    capitalAccountPctGdp,
    usRealYield10Y,
    realYieldSpreadVsForeign,
    fxOvershootInitialPct,
    fxOvershootPath,
    grexitStyleInversionRisk,
  };
}

/**
 * Image 4: 3 Forecasting Approaches Ensemble (Econometric, LEI/Nowcast, Checklist)
 */
export function calculateForecastingEnsemble(inputs, growthInfo, policyInfo) {
  // 1. Econometric model (anchors on trend + lagged policy + output gap mean reversion)
  const econometricGdpForecast = round2(
    growthInfo.shockAdjustedRealGdp - 0.32 * inputs.outputGap - 0.25 * (inputs.actualFedFundsRate - policyInfo.taylorImpliedRate)
  );

  // 2. LEI / Nowcasting (sensitive to 10Y-2Y yield curve slope + ISM/claims)
  const checklistValues = Object.values(inputs.checklistScores);
  const checklistCompositeScore = round2(
    checklistValues.reduce((acc, v) => acc + v, 0) / Math.max(checklistValues.length, 1)
  );
  const leiNowcastGdpForecast = round2(
    growthInfo.shockAdjustedRealGdp + 0.55 * policyInfo.slope10Y2Y + 0.65 * checklistCompositeScore
  );

  // 3. Checklist Approach (pure subjective judgmental integration)
  const checklistGdpForecast = round2(growthInfo.realTrendGdp + 1.15 * checklistCompositeScore);

  const wSum = Math.max(
    inputs.modelWeights.econometric + inputs.modelWeights.leiNowcast + inputs.modelWeights.checklist,
    0.001
  );
  const blendedGdpForecast = round2(
    (inputs.modelWeights.econometric * econometricGdpForecast +
      inputs.modelWeights.leiNowcast * leiNowcastGdpForecast +
      inputs.modelWeights.checklist * checklistGdpForecast) /
      wSum
  );

  // Probit-style recession probability driven by curve inversion, negative checklist, and slowdown/contraction
  const phaseRecessionBase =
    inputs.cyclePhase === 'contraction'
      ? 78
      : inputs.cyclePhase === 'slowdown'
      ? 42
      : inputs.cyclePhase === 'late-expansion'
      ? 22
      : 10;
  const inversionBoost = policyInfo.slope10Y2Y < 0 ? Math.abs(policyInfo.slope10Y2Y) * 28 : -policyInfo.slope10Y2Y * 6;
  const checklistAdj = -checklistCompositeScore * 12;
  const recessionProbability = Math.round(clamp(phaseRecessionBase + inversionBoost + checklistAdj, 3, 96));

  return {
    econometricGdpForecast,
    leiNowcastGdpForecast,
    checklistGdpForecast,
    blendedGdpForecast,
    recessionProbability,
    checklistCompositeScore,
  };
}

/**
 * Master Engine: Synthesize 7 US Asset Class CMEs + 7x7 Correlation Matrix (Image 2 Closure)
 */
export function runFullMacroCmeSimulation(inputs) {
  const growthInfo = calculateTrendGrowthAndEquityAnchor(inputs);
  const policyInfo = calculateTaylorRuleAndPolicyMix(inputs, growthInfo);
  const biasAudit = calculateBiasAndUnsmoothing(inputs);

  const y3m = policyInfo.yieldCurve.find((p) => p.tenor === '3M')?.simulatedYield ?? inputs.actualFedFundsRate;
  const y10y = policyInfo.yieldCurve.find((p) => p.tenor === '10Y')?.simulatedYield ?? 4.0;
  const international = calculateInternationalLinkages(inputs, y10y);
  const forecasting = calculateForecastingEnsemble(inputs, growthInfo, policyInfo);

  const windowStats = SAMPLE_WINDOW_STATS[inputs.sampleWindowId] || SAMPLE_WINDOW_STATS['full-1970-2025'];
  const lambda = clamp(inputs.shrinkageLambda, 0, 1);

  // Cycle & Inflation Scenario conditional adjustments
  const cycleReturnAdjustments = {
    'initial-recovery': { cash: -0.6, treasury: 0.4, tips: 0.5, ig: 1.8, hy: 4.2, equities: 4.5, reits: 3.2 },
    'early-expansion': { cash: -0.2, treasury: -0.2, tips: 0.2, ig: 1.0, hy: 2.2, equities: 2.5, reits: 2.0 },
    'late-expansion': { cash: 0.3, treasury: -0.4, tips: 1.1, ig: 0.2, hy: -0.4, equities: -0.6, reits: 0.4 },
    'slowdown': { cash: 0.4, treasury: 1.6, tips: 0.4, ig: 0.3, hy: -2.6, equities: -3.2, reits: -1.8 },
    'contraction': { cash: 0.2, treasury: 2.8, tips: 0.2, ig: -0.4, hy: -4.5, equities: -4.2, reits: -3.5 },
  };
  const cycleAdj = cycleReturnAdjustments[inputs.cyclePhase] || cycleReturnAdjustments['late-expansion'];

  const inflationScenarioAdjustments = {
    'normal-procyclical': { cash: 0.0, treasury: 0.0, tips: 0.2, ig: 0.0, hy: 0.1, equities: 0.2, reits: 0.5 },
    'high-inflation-surprise': { cash: 0.9, treasury: -3.4, tips: 1.8, ig: -2.6, hy: -2.2, equities: -2.4, reits: -0.5 },
    'deflation-zlb': { cash: 0.4, treasury: 3.1, tips: -1.6, ig: 0.8, hy: -4.2, equities: -4.8, reits: -4.2 },
  };
  const infAdj = inflationScenarioAdjustments[inputs.inflationScenario] || inflationScenarioAdjustments['normal-procyclical'];

  // ZIRP CME rule (Image 8): Under ZIRP, long-term cash/bond expectation anchors toward r_neutral + pi_e
  const cashCondBase = inputs.zirpNirpMode && inputs.horizonYears >= 5
    ? 0.45 * y3m + 0.55 * policyInfo.cmeZirpAnchorRate
    : y3m;

  const pitDrag = inputs.usePointInTimeData ? 0 : 0.45; // Look-ahead illusion overstates unadjusted model returns
  const pesoDrag = biasAudit.pesoAnnualDragPct;

  const rawConditionalReturns = {
    'us-cash': round2(cashCondBase + cycleAdj.cash * 0.5 + infAdj.cash),
    'us-10y-treasury': round2(
      (inputs.zirpNirpMode && inputs.horizonYears >= 5 ? 0.5 * y10y + 0.5 * policyInfo.cmeZirpAnchorRate : y10y) +
        cycleAdj.treasury * (inputs.horizonYears === 1 ? 1.3 : 0.55) +
        infAdj.treasury * (inputs.horizonYears === 1 ? 1.4 : 0.6) +
        pesoDrag * 0.12
    ),
    'us-tips': round2(
      Math.max(y10y - inputs.expectedInflation, 0.2) +
        inputs.expectedInflation +
        cycleAdj.tips * 0.6 +
        infAdj.tips
    ),
    'us-ig-corp': round2(y10y + 1.15 + cycleAdj.ig * 0.65 + infAdj.ig - pesoDrag * 0.25),
    'us-high-yield': round2(y10y + 3.65 + cycleAdj.hy * 0.75 + infAdj.hy - pesoDrag * 0.65),
    'us-equities': round2(
      growthInfo.equityAnchorBreakdown.totalExpectedEquityReturn +
        cycleAdj.equities * (inputs.horizonYears === 1 ? 1.35 : inputs.horizonYears === 5 ? 0.55 : 0.25) +
        infAdj.equities * (inputs.horizonYears === 1 ? 1.25 : 0.5) -
        pesoDrag * 0.85 +
        pitDrag
    ),
    'us-reits': round2(
      growthInfo.nominalTrendGdp * 0.7 +
        3.4 +
        cycleAdj.reits * 0.7 +
        infAdj.reits -
        pesoDrag * 0.55
    ),
  };

  const unconditionalMeans = {
    'us-cash': windowStats.cashMean,
    'us-10y-treasury': windowStats.bondsMean,
    'us-tips': windowStats.tipsMean,
    'us-ig-corp': windowStats.igMean,
    'us-high-yield': windowStats.hyMean,
    'us-equities': windowStats.equitiesMean,
    'us-reits': windowStats.reitMean,
  };

  const cycleVerdictMap = (condReturn, uncondReturn, assetId) => {
    if (assetId === 'us-cash') {
      return inputs.inflationScenario === 'deflation-zlb' || inputs.cyclePhase === 'slowdown' ? 'Overweight' : 'Neutral';
    }
    const diff = condReturn - uncondReturn;
    if (diff >= 0.8) return 'Overweight';
    if (diff <= -1.0) return 'Underweight';
    return 'Neutral';
  };

  const inflationVerdictText = {
    'us-cash':
      inputs.inflationScenario === 'deflation-zlb'
        ? '极具吸引力 (ZLB下实际购买力飙升)'
        : inputs.inflationScenario === 'high-inflation-surprise'
        ? '相对抗跌 (短久期跟随加息)'
        : '随政策利率波动',
    'us-10y-treasury':
      inputs.inflationScenario === 'high-inflation-surprise'
        ? '极度脆弱 (通胀预期飙升引发久期重创)'
        : inputs.inflationScenario === 'deflation-zlb'
        ? '极度利好 (固定名义现金流升值)'
        : '温和稳定',
    'us-tips':
      inputs.inflationScenario === 'high-inflation-surprise'
        ? '核心对冲工具 (本金随CPI指数化上调)'
        : inputs.inflationScenario === 'deflation-zlb'
        ? '平价下限保护有限'
        : '提供真实无风险锚',
    'us-ig-corp':
      inputs.inflationScenario === 'high-inflation-surprise'
        ? '久期与利差双重承压'
        : inputs.inflationScenario === 'deflation-zlb'
        ? '高评级受益但需防降级'
        : '票息与利差稳健',
    'us-high-yield':
      inputs.inflationScenario === 'deflation-zlb'
        ? '违约浪潮风险 (实际债务负担骤增)'
        : inputs.inflationScenario === 'high-inflation-surprise'
        ? '短久期缓冲但衰退尾部风险升高'
        : '复苏/扩张期具carry优势',
    'us-equities':
      inputs.inflationScenario === 'high-inflation-surprise'
        ? '估值倍数压缩 (仅定价权龙头抗跌)'
        : inputs.inflationScenario === 'deflation-zlb'
        ? '显著负面 (营收萎缩与杠杆重压)'
        : '长期现金流随通胀重定价',
    'us-reits':
      inputs.inflationScenario === 'high-inflation-surprise'
        ? '分化对冲 (短租期+固定利率负债占优)'
        : inputs.inflationScenario === 'deflation-zlb'
        ? '下行压力大 (空置率与租金双降)'
        : '稳定升值 (去平滑后真实波动翻倍)',
  };

  const assetForecasts = ASSET_CLASS_METADATA.map((meta) => {
    const uncond = unconditionalMeans[meta.id];
    const cond = rawConditionalReturns[meta.id];
    const blended = round2(lambda * cond + (1 - lambda) * uncond);
    const realRet = round2(blended - inputs.expectedInflation);
    const reportedVol = meta.baseVol;
    const trueVol = meta.id === 'us-reits' ? biasAudit.unsmoothedReitVol : round2(meta.baseVol * (1 + inputs.pesoTailProb * 1.4));
    const cashRateForSharpe = y3m;
    const sharpe = trueVol > 0 ? round2((blended - cashRateForSharpe) / trueVol) : 0;

    return {
      id: meta.id,
      name: meta.name,
      chineseName: meta.chineseName,
      category: meta.category,
      unconditionalReturn: uncond,
      conditionalReturn: cond,
      blendedExpectedReturn: blended,
      expectedRealReturn: realRet,
      reportedVol,
      trueUnsmoothedVol: trueVol,
      sharpeRatio: sharpe,
      cycleVerdict: cycleVerdictMap(cond, uncond, meta.id),
      inflationScenarioVerdict: inflationVerdictText[meta.id],
      driverAttribution:
        meta.id === 'us-equities'
          ? `名义GDP ${growthInfo.equityAnchorBreakdown.nominalGdpContrib}% + 股息回购 ${growthInfo.equityAnchorBreakdown.incomeYieldContrib}% + ΔSk/PE ${(growthInfo.equityAnchorBreakdown.profitShareContrib + growthInfo.equityAnchorBreakdown.valuationContrib).toFixed(2)}%`
          : meta.id === 'us-10y-treasury'
          ? `10Y名义收益率 ${y10y.toFixed(2)}% ± 周期与通胀久期重估`
          : meta.id === 'us-reits'
          ? `去平滑α=${inputs.appraisalSmoothingAlpha.toFixed(2)} 还原真实波动率 ${trueVol.toFixed(1)}%`
          : `经Shrinkage(λ=${lambda.toFixed(2)})与Peso尾部(${biasAudit.pesoAnnualDragPct}%)校准`,
    };
  });

  // 7x7 Correlation Matrix conditioned on Inflation & Smoothing Regime
  const corrEqBond = biasAudit.asyncVsSyncedEquityBondCorr.trueSynced;
  const reitTrueCorrBoost = round2((1 - clamp(inputs.appraisalSmoothingAlpha, 0.2, 1)) * 0.25);
  const correlationLabels = ['Cash', '10Y UST', 'TIPS', 'IG Corp', 'High Yield', 'S&P 500', 'REITs'];
  const correlationMatrix = [
    [1.0, 0.12, 0.10, 0.08, -0.05, -0.08, -0.05],
    [0.12, 1.0, 0.78, 0.82, 0.24, corrEqBond, round2(0.18 + reitTrueCorrBoost * 0.4)],
    [0.10, 0.78, 1.0, 0.72, 0.35, round2(corrEqBond + 0.18), 0.32],
    [0.08, 0.82, 0.72, 1.0, 0.62, round2(0.38 + (corrEqBond > 0 ? 0.18 : 0)), 0.44],
    [-0.05, 0.24, 0.35, 0.62, 1.0, 0.74, 0.65],
    [-0.08, corrEqBond, round2(corrEqBond + 0.18), round2(0.38 + (corrEqBond > 0 ? 0.18 : 0)), 0.74, 1.0, round2(0.58 + reitTrueCorrBoost)],
    [-0.05, round2(0.18 + reitTrueCorrBoost * 0.4), 0.32, 0.44, 0.65, round2(0.58 + reitTrueCorrBoost), 1.0],
  ];

  const eqForecast = assetForecasts.find((a) => a.id === 'us-equities')?.blendedExpectedReturn ?? 7.5;
  const ustForecast = assetForecasts.find((a) => a.id === 'us-10y-treasury')?.blendedExpectedReturn ?? 4.0;
  const equityRiskPremium = round2(eqForecast - ustForecast);

  return {
    ...growthInfo,
    forecasting,
    policy: policyInfo,
    international,
    biasAudit,
    assetForecasts,
    correlationLabels,
    correlationMatrix,
    equityRiskPremium,
  };
}

/**
 * Step 7 CME Monitor & Feedback Simulator: compare realized 1Y outcomes against forecast
 */
export function simulateCmeOutcomeFeedback(inputs, engineOutput, realizedShockType) {
  const eqForecast = engineOutput.assetForecasts.find((a) => a.id === 'us-equities')?.blendedExpectedReturn ?? 7.0;
  const bondForecast = engineOutput.assetForecasts.find((a) => a.id === 'us-10y-treasury')?.blendedExpectedReturn ?? 4.0;

  let realizedGrowthShock = 0;
  let realizedInflationSurprise = 0;
  let valuationSurprise = 0;

  if (realizedShockType === 'ai-productivity-beat') {
    realizedGrowthShock = 1.25;
    realizedInflationSurprise = -0.35;
    valuationSurprise = 4.8;
  } else if (realizedShockType === 'stagflation-surprise') {
    realizedGrowthShock = -1.65;
    realizedInflationSurprise = 2.15;
    valuationSurprise = -9.5;
  } else if (realizedShockType === 'recession-hard-landing') {
    realizedGrowthShock = -2.40;
    realizedInflationSurprise = -1.10;
    valuationSurprise = -14.0;
  } else {
    realizedGrowthShock = 0.20;
    realizedInflationSurprise = -0.10;
    valuationSurprise = 0.80;
  }

  const realizedEquityReturn = round2(eqForecast + realizedGrowthShock * 2.4 - realizedInflationSurprise * 1.8 + valuationSurprise);
  const realizedBondReturn = round2(bondForecast - realizedInflationSurprise * 4.8 - realizedGrowthShock * 1.2);

  const forecastErrorEquityBps = Math.round((realizedEquityReturn - eqForecast) * 100);
  const forecastErrorBondBps = Math.round((realizedBondReturn - bondForecast) * 100);

  const attributionNotes = [
    `经济增长意外 (${realizedGrowthShock >= 0 ? '+' : ''}${realizedGrowthShock.toFixed(2)}%): 对美股盈利贡献 ${(realizedGrowthShock * 2.4).toFixed(2)}%，对10Y美债避险/利率重定价贡献 ${(-realizedGrowthShock * 1.2).toFixed(2)}%。`,
    `通胀路径偏离 (${realizedInflationSurprise >= 0 ? '+' : ''}${realizedInflationSurprise.toFixed(2)}%): 驱动长端名义国债估值变动 ${(-realizedInflationSurprise * 4.8).toFixed(2)}%（验证图6“通胀意外对久期债券最敏感”）。`,
    `风险溢价与PE倍数重估 (${valuationSurprise >= 0 ? '+' : ''}${valuationSurprise.toFixed(2)}%): 提示第7步反馈循环中应检查 λ=${inputs.shrinkageLambda.toFixed(2)} 与当前周期判定是否滞后。`,
  ];

  return {
    horizonLabel: '1年期实际结果复盘 (Step 7 Feedback)',
    realizedGrowthShock,
    realizedInflationSurprise,
    realizedEquityReturn,
    realizedBondReturn,
    forecastErrorEquityBps,
    forecastErrorBondBps,
    attributionNotes,
  };
}
