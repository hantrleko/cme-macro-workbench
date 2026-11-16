import React from 'react';
import { MacroEngineOutput, MacroSimulationInputs } from '../types/macro';
import { BUSINESS_CYCLE_PHASES } from '../data/usMacroPresets';
import { formatBps, formatPct } from '../utils/formatters';
import { TrendingUp, Compass, Scale, Globe2, AlertTriangle } from 'lucide-react';

interface MacroTelemetryHudProps {
  inputs: MacroSimulationInputs;
  output: MacroEngineOutput;
}

export const MacroTelemetryHud: React.FC<MacroTelemetryHudProps> = ({ inputs, output }) => {
  const cycleMeta = BUSINESS_CYCLE_PHASES.find((p) => p.id === inputs.cyclePhase) ?? BUSINESS_CYCLE_PHASES[2];
  const eqForecast = output.assetForecasts.find((a) => a.id === 'us-equities')?.blendedExpectedReturn ?? 0;
  const ustForecast = output.assetForecasts.find((a) => a.id === 'us-10y-treasury')?.blendedExpectedReturn ?? 0;
  const y10 = output.policy.yieldCurve.find((p) => p.tenor === '10Y')?.simulatedYield ?? 0;

  return (
    <div className="bg-slate-900/70 border-b border-slate-800/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* 1. Cycle Phase */}
        <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800/80">
          <Compass className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-slate-400 uppercase">商业周期 & 衰退概率</div>
            <div className="text-xs font-bold text-slate-100 truncate flex items-center gap-1.5">
              <span>{cycleMeta.name}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300">
                P={output.forecasting.recessionProbability}%
              </span>
            </div>
          </div>
        </div>

        {/* 2. Trend & Blended GDP */}
        <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800/80">
          <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-slate-400 uppercase">美国潜在GDP / 集成预测</div>
            <div className="text-xs font-mono font-bold text-slate-100 truncate">
              <span className="text-emerald-300">{formatPct(output.shockAdjustedRealGdp)}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-cyan-300">{formatPct(output.forecasting.blendedGdpForecast)}</span>
              <span className="text-[10px] text-slate-400 ml-1">(名义 {formatPct(output.nominalTrendGdp)})</span>
            </div>
          </div>
        </div>

        {/* 3. Taylor Rule vs Fed Funds */}
        <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800/80">
          <Scale className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-slate-400 uppercase">泰勒规则 i* vs 联邦基金</div>
            <div className="text-xs font-mono font-bold truncate">
              <span className="text-amber-300">{formatPct(output.policy.taylorImpliedRate)}</span>
              <span className="text-slate-500 mx-1">vs</span>
              <span className="text-slate-100">{formatPct(inputs.actualFedFundsRate)}</span>
              <span
                className={`ml-1.5 text-[10px] ${
                  Math.abs(output.policy.policyGapBps) >= 75 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                ({formatBps(output.policy.policyGapBps)})
              </span>
            </div>
          </div>
        </div>

        {/* 4. 10Y UST & 2s10s Spread */}
        <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800/80">
          <AlertTriangle
            className={`w-4 h-4 flex-shrink-0 ${
              output.policy.slope10Y2Y < 0 ? 'text-rose-400' : 'text-cyan-400'
            }`}
          />
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-slate-400 uppercase">10Y美债 & 2s10s利差</div>
            <div className="text-xs font-mono font-bold truncate">
              <span className="text-slate-100">{formatPct(y10)}</span>
              <span
                className={`ml-2 px-1.5 py-0.2 rounded text-[10px] ${
                  output.policy.slope10Y2Y < 0
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-700/50'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                }`}
              >
                2s10s {formatPct(output.policy.slope10Y2Y, 2, true)}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Twin Deficits Identity */}
        <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800/80">
          <Globe2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-slate-400 uppercase">经常账户 (X-M) / 资本镜像</div>
            <div className="text-xs font-mono font-bold truncate">
              <span className={output.international.currentAccountPctGdp < 0 ? 'text-rose-300' : 'text-emerald-300'}>
                {formatPct(output.international.currentAccountPctGdp, 2, true)}
              </span>
              <span className="text-slate-500 mx-1">↔</span>
              <span className="text-indigo-300">
                KA {formatPct(output.international.capitalAccountPctGdp, 2, true)}
              </span>
            </div>
          </div>
        </div>

        {/* 6. Expected Equity vs 10Y Bond & ERP */}
        <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800/80">
          <div className="w-1.5 h-7 rounded-full bg-gradient-to-b from-cyan-400 to-emerald-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-slate-400 uppercase">
              S&P500 / 10Y债 ({inputs.horizonYears}Y CME)
            </div>
            <div className="text-xs font-mono font-bold truncate">
              <span className="text-cyan-300">{formatPct(eqForecast)}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-emerald-300">{formatPct(ustForecast)}</span>
              <span className="text-[10px] text-amber-300 ml-1.5">
                ERP {formatPct(output.equityRiskPremium, 2, true)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
