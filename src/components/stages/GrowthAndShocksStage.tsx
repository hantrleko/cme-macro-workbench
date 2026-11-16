import React, { useMemo } from 'react';
import {
  MacroEngineOutput,
  MacroSimulationInputs,
  ShockSourceId,
  ShockTrajectoryType,
} from '../../types/macro';
import { SHOCK_SOURCES_META } from '../../data/usMacroPresets';
import { EChartWrapper } from '../EChartWrapper';
import { formatPct } from '../../utils/formatters';
import { TrendingUp, Zap, AlertOctagon, Anchor } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface GrowthAndShocksStageProps {
  inputs: MacroSimulationInputs;
  output: MacroEngineOutput;
  onUpdateInputs: (patch: Partial<MacroSimulationInputs>) => void;
}

export const GrowthAndShocksStage: React.FC<GrowthAndShocksStageProps> = ({
  inputs,
  output,
  onUpdateInputs,
}) => {
  // Chart 1: Equity Anchor Waterfall V_e = GDP * S_k * PE
  const equityAnchorChartOption = useMemo<EChartsOption>(() => {
    const eq = output.equityAnchorBreakdown;
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
      grid: { left: 48, right: 20, top: 26, bottom: 32 },
      xAxis: {
        type: 'category',
        data: ['实际GDP+通胀(名义)', '利润份额 ΔS_k', '估值倍数 ΔPE', '股息+净回购', 'S&P500 长期总锚'],
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', formatter: '{value}%', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [
        {
          type: 'bar',
          data: [
            { value: eq.nominalGdpContrib, itemStyle: { color: '#38bdf8' } },
            { value: eq.profitShareContrib, itemStyle: { color: eq.profitShareContrib >= 0 ? '#34d399' : '#f43f5e' } },
            { value: eq.valuationContrib, itemStyle: { color: eq.valuationContrib >= 0 ? '#a78bfa' : '#fb7185' } },
            { value: eq.incomeYieldContrib, itemStyle: { color: '#fbbf24' } },
            { value: eq.totalExpectedEquityReturn, itemStyle: { color: '#22d3ee', borderRadius: [4, 4, 0, 0] } },
          ],
          barWidth: '46%',
          label: {
            show: true,
            position: 'top',
            color: '#e2e8f0',
            fontFamily: 'JetBrains Mono',
            fontSize: 11,
            formatter: (p: unknown) => {
              const item = p as { value: number };
              return `${item.value >= 0 ? '+' : ''}${Number(item.value).toFixed(2)}%`;
            },
          },
        },
      ],
    };
  }, [output.equityAnchorBreakdown]);

  // Chart 2: Exogenous Shock 3 Growth Paths (Image 11)
  const shockPathChartOption = useMemo<EChartsOption>(() => {
    const labels = output.gdpTrajectory.map((p) => p.label);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
      legend: {
        data: ['无冲击趋势基线', '类型1: 仅水平永久下移', '类型2: 仅趋势增速放缓', '类型3: 双杀 (如欧元区)'],
        textStyle: { color: '#94a3b8', fontSize: 10 },
        top: 0,
      },
      grid: { left: 46, right: 20, top: 36, bottom: 28 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [
        {
          name: '无冲击趋势基线',
          type: 'line',
          smooth: true,
          data: output.gdpTrajectory.map((p) => p.baselineTrend),
          lineStyle: { color: '#94a3b8', type: 'dashed', width: 2 },
          itemStyle: { color: '#94a3b8' },
        },
        {
          name: '类型1: 仅水平永久下移',
          type: 'line',
          smooth: false,
          data: output.gdpTrajectory.map((p) => p.type1LevelDrop),
          lineStyle: { color: '#22d3ee', width: inputs.shockTrajectoryType === 'type1-level-drop' ? 3.5 : 1.8 },
          itemStyle: { color: '#22d3ee' },
        },
        {
          name: '类型2: 仅趋势增速放缓',
          type: 'line',
          smooth: true,
          data: output.gdpTrajectory.map((p) => p.type2SlopeDrop),
          lineStyle: { color: '#fbbf24', width: inputs.shockTrajectoryType === 'type2-slope-drop' ? 3.5 : 1.8 },
          itemStyle: { color: '#fbbf24' },
        },
        {
          name: '类型3: 双杀 (如欧元区)',
          type: 'line',
          smooth: false,
          data: output.gdpTrajectory.map((p) => p.type3Hysteresis),
          lineStyle: { color: '#f43f5e', width: inputs.shockTrajectoryType === 'type3-hysteresis' ? 3.5 : 1.8 },
          itemStyle: { color: '#f43f5e' },
        },
      ],
    };
  }, [output.gdpTrajectory, inputs.shockTrajectoryType]);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Section A: Image 3 - Growth Analysis & Equity Anchor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Solow GDP Decomposition Controls */}
        <div className="lg:col-span-5 glass-card p-4 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase">图3 · Solow 潜在增长拆解</span>
              <h3 className="text-sm font-bold text-slate-100">美国长期趋势 GDP 与股票锚定</h3>
            </div>
            <Anchor className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">劳动力贡献</div>
              <div className="text-sm font-bold text-cyan-300">{formatPct(output.laborContribution)}</div>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">劳动生产率</div>
              <div className="text-sm font-bold text-emerald-300">{formatPct(output.productivityContribution)}</div>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-700/40">
              <div className="text-[10px] text-emerald-300">潜在实际GDP</div>
              <div className="text-sm font-bold text-white">{formatPct(output.shockAdjustedRealGdp)}</div>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            {[
              { label: '适龄劳动人口增长 (人口/移民)', key: 'laborForceGrowth' as const, min: -0.5, max: 2.5, step: 0.05 },
              { label: '劳动参与率变化 (老龄化/重返就业)', key: 'laborParticipationDelta' as const, min: -1.0, max: 1.0, step: 0.05 },
              { label: '资本深化 (人均资本存量增长)', key: 'capitalDeepening' as const, min: 0.0, max: 2.0, step: 0.05 },
              { label: '全要素生产率 TFP (AI/技术进步)', key: 'tfpGrowth' as const, min: 0.0, max: 3.0, step: 0.05 },
              { label: '资本所得份额年变化 ΔS_k (盈利/GDP)', key: 'profitShareDeltaAnnual' as const, min: -2.0, max: 2.0, step: 0.05 },
              { label: '市盈率估值年变化 ΔPE (长期趋于0)', key: 'peReRatingAnnual' as const, min: -3.5, max: 3.0, step: 0.1 },
            ].map((s) => (
              <div key={s.key} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">{s.label}</span>
                  <span className="font-mono font-bold text-cyan-300">{inputs[s.key].toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={inputs[s.key]}
                  onChange={(e) => onUpdateInputs({ [s.key]: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Equity Anchor Waterfall + Why High Growth != High Equity Returns */}
        <div className="lg:col-span-7 glass-card p-4 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-100">
                股票长期价值锚定：V_e = GDP × S_k × PE 收益拆解 ({inputs.horizonYears}年视野)
              </h3>
              <span className="text-xs font-mono font-bold text-cyan-300">
                总长期锚定回报 = {formatPct(output.equityAnchorBreakdown.totalExpectedEquityReturn)}
              </span>
            </div>
            <EChartWrapper option={equityAnchorChartOption} height="230px" />
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              output.equityAnchorBreakdown.highGrowthTrapWarning
                ? 'bg-amber-950/35 border-amber-600/60'
                : 'bg-slate-950/75 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-amber-200 mb-1.5">
              <AlertOctagon className="w-4 h-4 text-amber-400" />
              <span>为什么高经济增长 ≠ 高股票回报？（图3三大机制验证）</span>
            </div>
            <p className="text-[11px] text-slate-300 mb-2">{output.equityAnchorBreakdown.highGrowthTrapReason}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <div className="font-bold text-cyan-300">1. 估值已提前反映</div>
                <div className="text-slate-400 mt-0.5">高增长预期已被计入当前股价，后续缺乏增量超额回报。</div>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <div className="font-bold text-purple-300">2. 资本回报率下降</div>
                <div className="text-slate-400 mt-0.5">资本过快扩张压低ROIC，同时新股增发稀释老股东权益。</div>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <div className="font-bold text-rose-300">3. 利润份额与倍数回落</div>
                <div className="text-slate-400 mt-0.5">长期内 S_k 与 PE 不可能无限上升，终将均值回归并拖累股价。</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section B: Image 11 - Exogenous Shocks & 3 Post-Crisis Paths */}
      <div className="glass-card p-4 rounded-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="text-[10px] font-mono text-rose-400 uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              图11 · 外生冲击与经济趋势（以 GFC 后三种路径为例）
            </div>
            <h3 className="text-sm font-bold text-slate-100 mt-0.5">
              外生冲击6大来源选择与未来 10 年美国 GDP 水平/斜率路径压力测试
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'none', label: '基准无永久冲击' },
                { id: 'type1-level-drop', label: '类型1: 产出水平永久下移' },
                { id: 'type2-slope-drop', label: '类型2: 趋势斜率放缓' },
                { id: 'type3-hysteresis', label: '类型3: 水平+斜率双杀' },
              ] as Array<{ id: ShockTrajectoryType; label: string }>
            ).map((tp) => (
              <button
                key={tp.id}
                onClick={() => onUpdateInputs({ shockTrajectoryType: tp.id })}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  inputs.shockTrajectoryType === tp.id
                    ? 'bg-rose-950/70 border-rose-500/70 text-rose-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tp.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">外生冲击幅值 (Shock Magnitude)</span>
                <span className="font-mono font-bold text-rose-300">{inputs.shockMagnitude.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={10.0}
                step={0.5}
                value={inputs.shockMagnitude}
                onChange={(e) => onUpdateInputs({ shockMagnitude: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="text-[11px] font-mono text-slate-400 uppercase pt-1">外生冲击 6 大来源</div>
            <div className="grid grid-cols-1 gap-1.5 max-h-[235px] overflow-y-auto pr-1">
              {SHOCK_SOURCES_META.map((src) => (
                <button
                  key={src.id}
                  onClick={() => onUpdateInputs({ shockSource: src.id as ShockSourceId })}
                  className={`text-left p-2.5 rounded-xl border transition-all ${
                    inputs.shockSource === src.id
                      ? 'bg-cyan-950/50 border-cyan-500/60 text-slate-100'
                      : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">{src.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{src.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between">
            <EChartWrapper option={shockPathChartOption} height="270px" />
            <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-mono">
              <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                <div className="text-slate-400">Y+10 无冲击基线</div>
                <div className="text-slate-200 font-bold">{output.gdpTrajectory[10].baselineTrend.toFixed(1)}</div>
              </div>
              <div className="bg-slate-950/80 p-2 rounded-lg border border-cyan-800/50">
                <div className="text-cyan-400">Y+10 类型1 (水平下移)</div>
                <div className="text-cyan-200 font-bold">{output.gdpTrajectory[10].type1LevelDrop.toFixed(1)}</div>
              </div>
              <div className="bg-slate-950/80 p-2 rounded-lg border border-rose-800/50">
                <div className="text-rose-400">Y+10 类型3 (迟滞双杀)</div>
                <div className="text-rose-200 font-bold">{output.gdpTrajectory[10].type3Hysteresis.toFixed(1)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
