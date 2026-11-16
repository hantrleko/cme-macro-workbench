import React, { useMemo } from 'react';
import {
  BusinessCyclePhase,
  ChecklistIndicatorId,
  InflationScenarioId,
  MacroEngineOutput,
  MacroSimulationInputs,
} from '../../types/macro';
import {
  BUSINESS_CYCLE_PHASES,
  CHECKLIST_INDICATORS_META,
  INFLATION_SCENARIO_MATRIX,
} from '../../data/usMacroPresets';
import { EChartWrapper } from '../EChartWrapper';
import { formatPct } from '../../utils/formatters';
import { Compass, Flame, Cpu, CheckSquare, Activity } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface CycleAndForecastingStageProps {
  inputs: MacroSimulationInputs;
  output: MacroEngineOutput;
  onUpdateInputs: (patch: Partial<MacroSimulationInputs>) => void;
}

export const CycleAndForecastingStage: React.FC<CycleAndForecastingStageProps> = ({
  inputs,
  output,
  onUpdateInputs,
}) => {
  // Business Cycle Sine Wave Visual
  const cycleWaveOption = useMemo<EChartsOption>(() => {
    const phases = BUSINESS_CYCLE_PHASES;
    const waveValues = [25, 65, 92, 58, 18];
    const activeIdx = phases.findIndex((p) => p.id === inputs.cyclePhase);

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
      grid: { left: 30, right: 30, top: 30, bottom: 32 },
      xAxis: {
        type: 'category',
        data: phases.map((p) => p.name),
        axisLabel: { color: '#cbd5e1', fontSize: 11 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 105,
        show: false,
      },
      series: [
        {
          type: 'line',
          smooth: 0.45,
          data: waveValues.map((v, i) => ({
            value: v,
            symbolSize: i === activeIdx ? 18 : 10,
            itemStyle: {
              color: i === activeIdx ? '#22d3ee' : '#475569',
              borderColor: i === activeIdx ? '#ffffff' : '#0f172a',
              borderWidth: i === activeIdx ? 2.5 : 1,
            },
          })),
          lineStyle: { color: '#0ea5e9', width: 3 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(14, 165, 233, 0.25)' },
                { offset: 1, color: 'rgba(14, 165, 233, 0.01)' },
              ],
            },
          },
        },
      ],
    };
  }, [inputs.cyclePhase]);

  const activeCycleMeta =
    BUSINESS_CYCLE_PHASES.find((p) => p.id === inputs.cyclePhase) ?? BUSINESS_CYCLE_PHASES[2];

  const handleChecklistChange = (id: ChecklistIndicatorId, val: number) => {
    onUpdateInputs({
      checklistScores: {
        ...inputs.checklistScores,
        [id]: val,
      },
    });
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Part 1: Image 4 - Three Approaches to Economic Forecasting */}
      <div className="glass-card p-4 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase">
              图4 · 三种经济预测方法同屏对比与集成权重引擎
            </div>
            <h3 className="text-sm font-bold text-slate-100 mt-0.5">
              计量经济模型法 (Econometric) vs 领先指标/即时预测 (LEI / GDPNow) vs 主观清单法 (Checklist)
            </h3>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">集成实际GDP预测:</span>
            <span className="text-cyan-300 font-bold">{formatPct(output.forecasting.blendedGdpForecast)}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">衰退概率:</span>
            <span
              className={`font-bold ${
                output.forecasting.recessionProbability >= 45 ? 'text-rose-400' : 'text-emerald-300'
              }`}
            >
              {output.forecasting.recessionProbability}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
          {/* Econometric */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                  <Cpu className="w-4 h-4" />
                  <span>1. 计量经济模型法</span>
                </div>
                <span className="font-mono font-bold text-slate-100">
                  {formatPct(output.forecasting.econometricGdpForecast)}
                </span>
              </div>
              <div className="text-[11px] text-emerald-300/90 bg-emerald-950/25 p-2 rounded-lg border border-emerald-800/30">
                <strong>优势：</strong>模型稳健包含多因素；结构一致定量评估外生冲击。
              </div>
              <div className="text-[11px] text-rose-300/90 bg-rose-950/25 p-2 rounded-lg border border-rose-800/30">
                <strong>劣势：</strong>构建复杂、参数可能结构漂移、给人虚假精确感且极难预测拐点。
              </div>
            </div>
            <div className="pt-2 space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">集成权重</span>
                <span className="text-cyan-300">{(inputs.modelWeights.econometric * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={inputs.modelWeights.econometric}
                onChange={(e) =>
                  onUpdateInputs({
                    modelWeights: { ...inputs.modelWeights, econometric: parseFloat(e.target.value) },
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* LEI / Nowcasting */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                  <Activity className="w-4 h-4" />
                  <span>2. 领先指标 & 即时预测</span>
                </div>
                <span className="font-mono font-bold text-slate-100">
                  {formatPct(output.forecasting.leiNowcastGdpForecast)}
                </span>
              </div>
              <div className="text-[11px] text-emerald-300/90 bg-emerald-950/25 p-2 rounded-lg border border-emerald-800/30">
                <strong>优势：</strong>直观简单、专注识别周期转折点（如 Atlanta Fed GDPNow & 2s10s）。
              </div>
              <div className="text-[11px] text-rose-300/90 bg-rose-950/25 p-2 rounded-lg border border-rose-800/30">
                <strong>劣势：</strong>历史数据频修（前瞻偏差）、样本内过拟合、仅提供二元方向与假信号。
              </div>
            </div>
            <div className="pt-2 space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">集成权重</span>
                <span className="text-emerald-300">{(inputs.modelWeights.leiNowcast * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={inputs.modelWeights.leiNowcast}
                onChange={(e) =>
                  onUpdateInputs({
                    modelWeights: { ...inputs.modelWeights, leiNowcast: parseFloat(e.target.value) },
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Checklist Approach */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <CheckSquare className="w-4 h-4" />
                  <span>3. 主观清单法 (Checklist)</span>
                </div>
                <span className="font-mono font-bold text-slate-100">
                  {formatPct(output.forecasting.checklistGdpForecast)}
                </span>
              </div>
              <div className="text-[11px] text-emerald-300/90 bg-emerald-950/25 p-2 rounded-lg border border-emerald-800/30">
                <strong>优势：</strong>高度灵活、易于及时纳入结构性变革与跨学科非结构化信息。
              </div>
              <div className="text-[11px] text-rose-300/90 bg-rose-950/25 p-2 rounded-lg border border-rose-800/30">
                <strong>劣势：</strong>主观任意、人工耗时、不强制模型一致性且可能带入分析师偏见。
              </div>
            </div>
            <div className="pt-2 space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">集成权重</span>
                <span className="text-amber-300">{(inputs.modelWeights.checklist * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={inputs.modelWeights.checklist}
                onChange={(e) =>
                  onUpdateInputs({
                    modelWeights: { ...inputs.modelWeights, checklist: parseFloat(e.target.value) },
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Interactive Checklist Scorecard */}
        <div className="bg-slate-950/75 p-3.5 rounded-xl border border-slate-800/90">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-amber-200">
              清单法交互式打分卡 (-2 极弱衰退 → +2 强劲扩张) · 综合得分: {output.forecasting.checklistCompositeScore}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CHECKLIST_INDICATORS_META.map((item) => {
              const score = inputs.checklistScores[item.id as ChecklistIndicatorId];
              return (
                <div key={item.id} className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-slate-200">{item.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{item.fredCode}</div>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold ${
                        score > 0 ? 'text-emerald-300' : score < 0 ? 'text-rose-400' : 'text-slate-300'
                      }`}
                    >
                      {score > 0 ? `+${score}` : score}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-2}
                    max={2}
                    step={0.5}
                    value={score}
                    onChange={(e) =>
                      handleChecklistChange(item.id as ChecklistIndicatorId, parseFloat(e.target.value))
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Part 2: Image 5 - 5 Phases of the Business Cycle */}
      <div className="glass-card p-4 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              图5 · 商业周期的五个阶段及其对美国资本市场的影响
            </div>
            <h3 className="text-sm font-bold text-slate-100 mt-0.5">
              点击切换商业周期定位，联动更新利率曲线形态与大类资产条件预期
            </h3>
          </div>
        </div>

        <EChartWrapper option={cycleWaveOption} height="170px" />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
          {BUSINESS_CYCLE_PHASES.map((phase) => {
            const active = phase.id === inputs.cyclePhase;
            return (
              <button
                key={phase.id}
                onClick={() => onUpdateInputs({ cyclePhase: phase.id as BusinessCyclePhase })}
                className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                  active
                    ? 'bg-cyan-950/60 border-cyan-400/70 shadow-cyan-glow text-slate-100'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-100">{phase.name}</div>
                  <div className="text-[10px] font-mono text-cyan-400 mb-2">{phase.englishName}</div>
                  <div className="space-y-1.5 text-[11px]">
                    <p>
                      <strong className="text-slate-300">经济：</strong>
                      {phase.economyDesc}
                    </p>
                    <p>
                      <strong className="text-slate-300">曲线：</strong>
                      {phase.ratesAndCurveDesc}
                    </p>
                    <p>
                      <strong className="text-slate-300">股信：</strong>
                      {phase.stocksAndCreditDesc}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-slate-400 mr-2">当前阶段 ({activeCycleMeta.name}) 占优配置：</span>
            {activeCycleMeta.recommendedAssets.map((a) => (
              <span
                key={a}
                className="inline-block mr-1.5 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-700/40 text-emerald-300 text-[11px]"
              >
                {a}
              </span>
            ))}
          </div>
          <div>
            <span className="text-slate-400 mr-2">回避/低配：</span>
            {activeCycleMeta.avoidAssets.map((a) => (
              <span
                key={a}
                className="inline-block mr-1.5 px-2 py-0.5 rounded-md bg-rose-950/70 border border-rose-700/40 text-rose-300 text-[11px]"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Part 3: Image 6 - Inflation & Deflation Asset Matrix */}
      <div className="glass-card p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div>
            <div className="text-[10px] font-mono text-amber-400 uppercase flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              图6 · 通胀与通缩：商业周期及四大资产影响情景矩阵
            </div>
            <h3 className="text-sm font-bold text-slate-100 mt-0.5">
              现代信用货币体系以通胀为常态；点击激活情景直接重定价美股、美债、现金与REITs
            </h3>
          </div>
        </div>

        <div className="space-y-2.5">
          {INFLATION_SCENARIO_MATRIX.map((row) => {
            const active = inputs.inflationScenario === row.id;
            const cells = [
              { title: '现金 / 浮动利率', ...row.cashVerdict },
              { title: '名义债券 (UST)', ...row.nominalBondsVerdict },
              { title: '股票 (Equities)', ...row.equitiesVerdict },
              { title: '房地产 (REITs)', ...row.realEstateVerdict },
            ];
            return (
              <div
                key={row.id}
                onClick={() => onUpdateInputs({ inflationScenario: row.id as InflationScenarioId })}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  active
                    ? 'bg-amber-950/25 border-amber-500/70 shadow-amber-glow'
                    : 'bg-slate-950/75 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-2.5">
                  <div>
                    <span className="text-xs font-bold text-slate-100 mr-2">{row.title}</span>
                    <span className="text-[10px] font-mono text-amber-300">{row.englishTitle}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{row.macroRelation}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {cells.map((c) => (
                    <div key={c.title} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400">{c.title}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            c.tone === 'emerald'
                              ? 'bg-emerald-950 text-emerald-300'
                              : c.tone === 'rose'
                              ? 'bg-rose-950 text-rose-300'
                              : c.tone === 'amber'
                              ? 'bg-amber-950 text-amber-300'
                              : 'bg-cyan-950 text-cyan-300'
                          }`}
                        >
                          {c.rating}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{c.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
