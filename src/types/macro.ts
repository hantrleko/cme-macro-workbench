export type SampleWindowId =
  | 'full-1970-2025'
  | 'great-moderation-1985-2007'
  | 'post-gfc-zirp-2009-2021'
  | 'stagflation-1970-1982';

export type ShockSourceId =
  | 'none'
  | 'policy-tariff'
  | 'tech-ai'
  | 'geopolitics'
  | 'pandemic-disaster'
  | 'energy-resource'
  | 'financial-crisis';

export type ShockTrajectoryType =
  | 'none'
  | 'type1-level-drop'
  | 'type2-slope-drop'
  | 'type3-hysteresis';

export type BusinessCyclePhase =
  | 'initial-recovery'
  | 'early-expansion'
  | 'late-expansion'
  | 'slowdown'
  | 'contraction';

export type InflationScenarioId =
  | 'normal-procyclical'
  | 'high-inflation-surprise'
  | 'deflation-zlb';

export type PolicyStance = 'loose' | 'tight';

export type FxRegimeId = 'floating' | 'credibly-fixed' | 'pegged-fragile';

export type ChecklistIndicatorId =
  | 'ismManufacturingPmi'
  | 'initialJoblessClaims'
  | 'seniorLoanOfficerTightening'
  | 'copperGoldRatio'
  | 'corporateProfitMargins'
  | 'consumerConfidenceSpread';

export interface MacroSimulationInputs {
  // Stage 1: Data Limitations & Bias Parameters
  shrinkageLambda: number; // 0 (pure unconditional history) -> 1 (pure conditional current regime)
  appraisalSmoothingAlpha: number; // 0.25 -> 1.0 (Geltner unsmoothing parameter)
  pesoTailProb: number; // 0 -> 0.15 annual rare disaster probability
  sampleWindowId: SampleWindowId;
  usePointInTimeData: boolean; // true = ALFRED vintage PIT data; false = final revised look-ahead data

  // Stage 2: Trend Growth & Exogenous Shocks
  laborForceGrowth: number; // %
  laborParticipationDelta: number; // %
  capitalDeepening: number; // %
  tfpGrowth: number; // %
  profitShareDeltaAnnual: number; // % change in S_k (Earnings/GDP) per year
  peReRatingAnnual: number; // % annual P/E valuation expansion/compression
  dividendYield: number; // %
  netBuybackYield: number; // %
  shockSource: ShockSourceId;
  shockTrajectoryType: ShockTrajectoryType;
  shockMagnitude: number; // % severity (positive for negative shock depth, or positive boost for tech-ai)

  // Stage 3: Forecasting Ensemble & Business Cycle
  cyclePhase: BusinessCyclePhase;
  inflationScenario: InflationScenarioId;
  modelWeights: {
    econometric: number;
    leiNowcast: number;
    checklist: number;
  };
  checklistScores: Record<ChecklistIndicatorId, number>; // -2 to +2

  // Stage 4: Monetary/Fiscal Policy, Taylor Rule, ZIRP/QE & Yield Curve
  neutralRealRate: number; // r_neutral %
  targetInflation: number; // pi_target %
  expectedInflation: number; // pi_e %
  outputGap: number; // Y_e - Y_trend %
  actualFedFundsRate: number; // %
  fiscalStance: PolicyStance;
  monetaryStance: PolicyStance;
  fiscalDeficitPctGdp: number; // (G - T) / GDP in % (positive = deficit)
  govDebtPctGdp: number; // US Federal Debt / GDP in %
  qeActive: boolean;
  zirpNirpMode: boolean;
  cashFrictionThreshold: number; // % lower bound before cash hoarding (e.g. -0.75%)
  ldiPensionDemand: boolean;

  // Stage 5: International Linkages & Twin Deficits
  privateSavingPctGdp: number; // S % of GDP
  privateInvestmentPctGdp: number; // I % of GDP
  foreignRealYield: number; // % (e.g., EUR/JPY weighted real yield)
  fxRegime: FxRegimeId;
  pppDeviationInitial: number; // % initial USD valuation vs PPP

  // Stage 6: CME Horizon
  horizonYears: 1 | 5 | 10;

  // v2.0 CME Part 2: Asset-Class Specific Pricing Parameters (optional with engine defaults)
  globalIntegrationPhi?: number; // 0..1 Singer-Terhaar global market integration
  usEquityBetaToGlobal?: number; // Beta to global market portfolio
  globalMarketSharpe?: number; // Global Sharpe ratio benchmark
  igOasPct?: number; // US IG Corporate OAS (%)
  hyOasPct?: number; // US High Yield OAS (%)
  expectedCurveShiftBps?: number; // Expected annual parallel yield shift (bps)
  hyExpectedDefaultLossPct?: number; // Expected annual credit loss on HY (%)
  reitCapRate?: number; // Going-in Real Estate Cap Rate (%)
  reitNoiGrowth?: number; // Expected NOI growth (%)
  reitCapRateChangeAnnual?: number; // Annual Cap Rate compression (+) / expansion (-) (%)
}

export interface MacroRegimePreset {
  id: string;
  code: string;
  name: string;
  englishName: string;
  eraTag: string;
  badgeColor: 'cyan' | 'amber' | 'rose' | 'emerald' | 'purple' | 'indigo';
  summary: string;
  keyLesson: string;
  inputs: MacroSimulationInputs;
}

export interface AssetCmeForecast {
  id: string;
  name: string;
  chineseName: string;
  category: 'Cash' | 'Fixed Income' | 'Equities' | 'Real Assets';
  unconditionalReturn: number;
  conditionalReturn: number;
  blendedExpectedReturn: number;
  expectedRealReturn: number;
  reportedVol: number;
  trueUnsmoothedVol: number;
  sharpeRatio: number;
  cycleVerdict: 'Overweight' | 'Neutral' | 'Underweight';
  inflationScenarioVerdict: string;
  driverAttribution: string;
}

export interface YieldCurvePoint {
  tenor: string;
  years: number;
  simulatedYield: number;
  cycleBenchmarkYield: number;
  noQeCounterfactualYield: number;
}

export interface GdpPathPoint {
  year: number;
  label: string;
  baselineTrend: number;
  type1LevelDrop: number;
  type2SlopeDrop: number;
  type3Hysteresis: number;
  activePath: number;
}

export interface FxOvershootPoint {
  quarter: number;
  label: string;
  spotIndex: number;
  pppEquilibrium: number;
  realRateDifferential: number;
}

export interface MacroEngineOutput {
  // Trend Growth & Equity Anchor
  laborContribution: number;
  productivityContribution: number;
  realTrendGdp: number;
  shockAdjustedRealGdp: number;
  nominalTrendGdp: number;
  gdpTrajectory: GdpPathPoint[];
  equityAnchorBreakdown: {
    nominalGdpContrib: number;
    profitShareContrib: number;
    valuationContrib: number;
    incomeYieldContrib: number;
    totalExpectedEquityReturn: number;
    highGrowthTrapWarning: boolean;
    highGrowthTrapReason: string;
  };

  // Forecasting Ensemble
  forecasting: {
    econometricGdpForecast: number;
    leiNowcastGdpForecast: number;
    checklistGdpForecast: number;
    blendedGdpForecast: number;
    recessionProbability: number;
    checklistCompositeScore: number;
  };

  // Taylor Rule, Policy Mix, ZIRP & Yield Curve
  policy: {
    taylorImpliedRate: number;
    policyGapBps: number; // actualFedFundsRate - taylorImpliedRate in bps
    policyBiasLabel: '过度宽松 (Behind the Curve)' | '中性合意 (Neutral Fit)' | '过度紧缩 (Over-tightening Risk)';
    stringAsymmetryState: string;
    policyMixQuadrant: string;
    realRateLevelLabel: string;
    inflationPressureLabel: string;
    nominalRateLevelLabel: string;
    debtSpiralRiskScore: number; // 0-100
    debtSpiralRiskLabel: '可控 (Contained)' | '警戒 (Elevated)' | '高危政治化风险 (Politicization & Inflating Debt Risk)';
    zlbBreachFeasible: boolean;
    cmeZirpAnchorRate: number;
    yieldCurve: YieldCurvePoint[];
    slope10Y2Y: number;
    slope10Y3M: number;
    curveShapeLabel: string;
  };

  // International Linkages
  international: {
    netPrivateSavingPctGdp: number; // S - I
    fiscalBalancePctGdp: number; // T - G
    currentAccountPctGdp: number; // X - M = (S - I) + (T - G)
    capitalAccountPctGdp: number; // -(X - M) Mirror Image
    usRealYield10Y: number;
    realYieldSpreadVsForeign: number;
    fxOvershootInitialPct: number;
    fxOvershootPath: FxOvershootPoint[];
    grexitStyleInversionRisk: string;
  };

  // Data & Bias Audit
  biasAudit: {
    sampleWindowLabel: string;
    sampleWindowEquitiesMean: number;
    sampleWindowBondsMean: number;
    rawReitVol: number;
    unsmoothedReitVol: number;
    smoothingVolUnderstatementPct: number;
    pitVsRevisedGdpErrorBps: number;
    pesoAnnualDragPct: number;
    asyncVsSyncedEquityBondCorr: {
      asyncReported: number;
      trueSynced: number;
    };
  };

  // 7 US Asset Class CME Output + 7x7 Correlation Matrix
  assetForecasts: AssetCmeForecast[];
  correlationLabels: string[];
  correlationMatrix: number[][];
  equityRiskPremium: number;

  // v2.0 CME Part 2 Building Blocks
  part2BuildingBlocks: {
    equitiesGrinoldKroner: {
      dividendYield: number;
      netBuybackYield: number;
      realEarningsGrowth: number;
      inflationContrib: number;
      peReRating: number;
      grinoldKronerTotal: number;
      singerTerhaarErp: number;
      singerTerhaarTotal: number;
      globalIntegrationPhi: number;
    };
    fixedIncomeBlocks: Array<{
      id: string;
      name: string;
      yieldIncome: number;
      rolldownReturn: number;
      durationPriceEffect: number;
      creditLossDrag: number;
      totalReturn: number;
    }>;
    realEstateCapRate: {
      goingInCapRate: number;
      noiGrowth: number;
      capRateValuationEffect: number;
      totalReturn: number;
    };
  };
}

export interface FredQuarterlyRecord {
  quarter: string;
  fedFunds: number;
  corePceYoy: number;
  realGdpYoy: number;
  outputGap: number;
  igOas: number;
  hyOas: number;
  govDebtPctGdp: number;
  fiscalDeficitPctGdp: number;
  netExportsPctGdp: number;
  curve: {
    '3M': number;
    '1Y': number;
    '2Y': number;
    '5Y': number;
    '10Y': number;
    '20Y': number;
    '30Y': number;
  };
}

export interface FredLiveDataset {
  source: string;
  updatedAt: string;
  fetchedSeries: string[];
  failedSeries: string[];
  latestQuarter: string | null;
  count: number;
  records: FredQuarterlyRecord[];
}

export type PortfolioOptimizationMode = 'mvo' | 'risk-parity';

export interface PortfolioAllocationRow {
  id: string;
  name: string;
  chineseName: string;
  naiveWeightPct: number;
  calibratedWeightPct: number;
  weightDeltaPct: number;
  riskContributionPct: number;
}

export interface MonteCarloPathPoint {
  year: number;
  label: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface PortfolioOptimizerResult {
  mode: PortfolioOptimizationMode;
  allocations: PortfolioAllocationRow[];
  naiveMetrics: {
    expectedReturn: number;
    apparentVol: number;
    trueVol: number;
    apparentSharpe: number;
    trueSharpe: number;
  };
  calibratedMetrics: {
    expectedReturn: number;
    trueVol: number;
    realReturn: number;
    sharpeRatio: number;
    var95: number;
    cvar95: number;
    probBeatInflation: number;
  };
  monteCarloCorridor: MonteCarloPathPoint[];
}

export interface CmeFeedbackSimulation {
  horizonLabel: string;
  realizedGrowthShock: number;
  realizedInflationSurprise: number;
  realizedEquityReturn: number;
  realizedBondReturn: number;
  forecastErrorEquityBps: number;
  forecastErrorBondBps: number;
  attributionNotes: string[];
}
