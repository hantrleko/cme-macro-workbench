import {
  MacroSimulationInputs,
  MacroEngineOutput,
  CmeFeedbackSimulation,
} from '../types/macro';

export interface SampleWindowMeta {
  label: string;
  equitiesMean: number;
  bondsMean: number;
  cashMean: number;
  tipsMean: number;
  igMean: number;
  hyMean: number;
  reitMean: number;
  regimeBreakNote: string;
}

export const SAMPLE_WINDOW_STATS: Record<string, SampleWindowMeta>;
export function calculateTrendGrowthAndEquityAnchor(inputs: MacroSimulationInputs): Pick<
  MacroEngineOutput,
  | 'laborContribution'
  | 'productivityContribution'
  | 'realTrendGdp'
  | 'shockAdjustedRealGdp'
  | 'nominalTrendGdp'
  | 'gdpTrajectory'
  | 'equityAnchorBreakdown'
>;
export function calculateTaylorRuleAndPolicyMix(
  inputs: MacroSimulationInputs,
  growthInfo: ReturnType<typeof calculateTrendGrowthAndEquityAnchor>
): MacroEngineOutput['policy'];
export function calculateBiasAndUnsmoothing(inputs: MacroSimulationInputs): MacroEngineOutput['biasAudit'];
export function calculateInternationalLinkages(
  inputs: MacroSimulationInputs,
  yieldCurve10Y: number
): MacroEngineOutput['international'];
export function calculateForecastingEnsemble(
  inputs: MacroSimulationInputs,
  growthInfo: ReturnType<typeof calculateTrendGrowthAndEquityAnchor>,
  policyInfo: MacroEngineOutput['policy']
): MacroEngineOutput['forecasting'];
export function runFullMacroCmeSimulation(inputs: MacroSimulationInputs): MacroEngineOutput;
export function simulateCmeOutcomeFeedback(
  inputs: MacroSimulationInputs,
  engineOutput: MacroEngineOutput,
  realizedShockType: 'inline-consensus' | 'ai-productivity-beat' | 'stagflation-surprise' | 'recession-hard-landing'
): CmeFeedbackSimulation;
