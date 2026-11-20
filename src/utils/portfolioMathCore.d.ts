import {
  MacroEngineOutput,
  MacroSimulationInputs,
  PortfolioOptimizationMode,
  PortfolioOptimizerResult,
} from '../types/macro';

export interface OptimizerOptions {
  mode?: PortfolioOptimizationMode;
  riskAversionGamma?: number;
  maxWeight?: number;
  includePesoJump?: boolean;
  numSimulations?: number;
}

export function buildCovarianceMatrix(volsPct: number[], corrMatrix: number[][]): number[][];
export function solveMeanVarianceWeights(
  expectedReturnsPct: number[],
  covMatrix: number[][],
  riskAversionGamma?: number,
  maxWeight?: number
): number[];
export function solveRiskParityWeights(covMatrix: number[][], maxWeight?: number): number[];
export function runPortfolioOptimizationAndMonteCarlo(
  inputs: MacroSimulationInputs,
  engineOutput: MacroEngineOutput,
  options?: OptimizerOptions
): PortfolioOptimizerResult;
