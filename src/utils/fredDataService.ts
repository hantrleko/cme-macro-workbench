import { FredLiveDataset, FredQuarterlyRecord, MacroSimulationInputs, BusinessCyclePhase, InflationScenarioId } from '../types/macro';

export const FRED_ERA_BOOKMARKS = [
  { quarter: '1974-Q4', label: '1974 石油滞胀' },
  { quarter: '1981-Q3', label: '1981 沃尔克峰值' },
  { quarter: '1996-Q4', label: '1996 软着陆' },
  { quarter: '2000-Q3', label: '2000 科网泡沫' },
  { quarter: '2009-Q2', label: '2009 GFC谷底' },
  { quarter: '2020-Q2', label: '2020 疫情QE' },
  { quarter: '2022-Q4', label: '2022 激进紧缩' },
] as const;

export async function loadFredLiveDataset(): Promise<FredLiveDataset | null> {
  try {
    const resp = await fetch('./data/us_macro_live.json');
    if (!resp.ok) return null;
    const data = (await resp.json()) as FredLiveDataset;
    if (!data || !Array.isArray(data.records) || data.records.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Map an observed FRED quarterly snapshot into MacroSimulationInputs overrides
 */
export function mapFredRecordToInputs(
  rec: FredQuarterlyRecord,
  baseInputs: MacroSimulationInputs
): MacroSimulationInputs {
  const spread2s10s = rec.curve['10Y'] - rec.curve['2Y'];

  // Infer business cycle phase from observed real GDP YoY, output gap, and 2s10s slope
  let cyclePhase: BusinessCyclePhase = 'late-expansion';
  if (rec.realGdpYoy < 0.2) {
    cyclePhase = 'contraction';
  } else if (spread2s10s < -0.15) {
    cyclePhase = 'slowdown';
  } else if (rec.outputGap < -1.5 && rec.fedFunds <= 2.0) {
    cyclePhase = 'initial-recovery';
  } else if (rec.outputGap < 0 && rec.realGdpYoy >= 2.0) {
    cyclePhase = 'early-expansion';
  }

  // Infer inflation scenario from Core PCE YoY
  let inflationScenario: InflationScenarioId = 'normal-procyclical';
  if (rec.corePceYoy >= 3.8) {
    inflationScenario = 'high-inflation-surprise';
  } else if (rec.corePceYoy <= 0.6) {
    inflationScenario = 'deflation-zlb';
  }

  const zirpNirpMode = rec.fedFunds <= 0.35;
  const qeActive = zirpNirpMode || rec.quarter.startsWith('2009') || rec.quarter.startsWith('2010') || rec.quarter.startsWith('2011') || rec.quarter.startsWith('2020') || rec.quarter.startsWith('2021');
  const fiscalStance = rec.fiscalDeficitPctGdp >= 3.0 ? 'loose' : 'tight';
  const monetaryStance = rec.fedFunds >= rec.corePceYoy + 1.0 ? 'tight' : 'loose';

  // Derive consistent private net saving from National Income Identity: S - I = (X - M) - (T - G) = netExports + deficit
  const impliedPrivateNetSaving = rec.netExportsPctGdp + rec.fiscalDeficitPctGdp;
  const privateInvestmentPctGdp = 15.5;
  const privateSavingPctGdp = Math.round((privateInvestmentPctGdp + impliedPrivateNetSaving) * 10) / 10;

  return {
    ...baseInputs,
    cyclePhase,
    inflationScenario,
    expectedInflation: rec.corePceYoy,
    outputGap: rec.outputGap,
    actualFedFundsRate: rec.fedFunds,
    fiscalStance,
    monetaryStance,
    fiscalDeficitPctGdp: rec.fiscalDeficitPctGdp,
    govDebtPctGdp: rec.govDebtPctGdp,
    qeActive,
    zirpNirpMode,
    igOasPct: rec.igOas,
    hyOasPct: rec.hyOas,
    privateSavingPctGdp: Math.min(Math.max(privateSavingPctGdp, 10), 28),
    privateInvestmentPctGdp,
  };
}
