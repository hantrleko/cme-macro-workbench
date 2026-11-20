import React, { useMemo, useState } from 'react';
import {
  MacroEngineOutput,
  MacroSimulationInputs,
  PortfolioOptimizationMode,
} from '../../types/macro';
import { runPortfolioOptimizationAndMonteCarlo } from '../../utils/portfolioOptimizer';
import { EChartWrapper } from '../EChartWrapper';
import { formatPct } from '../../utils/formatters';
import { PieChart, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface PortfolioOptimizerStageProps {
  inputs: MacroSimulationInputs;
  output: MacroEngineOutput;
  onUpdateInputs: (patch: Partial<MacroSimulationInputs>) => void;
}

export const PortfolioOptimizerStage: React.FC<PortfolioOptimizerStageProps> = ({
  inputs,
  output,
}) => {
  const [mode, setMode] = useState<PortfolioOptimizationMode>('mvo');
  const [riskAversionGamma, setRiskAversionGamma] = useState<number>(3.5);
  const [maxWeight, setMaxWeight] = useState<number>(0.45);
  const [includePesoJump, setIncludePesoJump] = useState<boolean>(true);

  const result = useMemo(
    () =>
      runPortfolioOptimizationAndMonteCarlo(inputs, output, {
        mode,
        riskAversionGamma,
        maxWeight,
        includePesoJump,
        numSimulations: 1000,
      }),
    [inputs, output, mode, riskAversionGamma, maxWeight, includePesoJump]
  );

  // Chart 1: Naive (Smoothed / Unconditional) vs Calibrated CME Optimal Weights
  const weightsChartOption = useMemo<EChartsOption>(() => {
    const labels = result.allocations.map((a) => a.chineseName.replace(/ \(.*\)/, ''));
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
      legend: {
        data: ['未校准输入权重 (平滑+无条件均值)', '校准后 CME 最优权重 (去平滑+条件收缩)'],
        textStyle: { color: '#94a3b8', fontSize: 10 },
        top: 0,
      },
      grid: { left: 42, right: 16, top: 34, bottom: 52 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#cbd5e1', fontSize: 10, rotate: 20 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', formatter: '{value}%', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [
        {
          name: '未校准输入权重 (平滑+无条件均值)',
          type: 'bar',
          data: result.allocations.map((a) => a.naiveWeightPct),
          itemStyle: { color: '#64748b', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '校准后 CME 最优权重 (去平滑+条件收缩)',
          type: 'bar',
          data: result.allocations.map((a) => a.calibratedWeightPct),
          itemStyle: { color: '#22d3ee', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [result.allocations]);

  // Chart 2: 1,000-Run Monte Carlo Wealth Corridor (P10 / P25 / P50 / P75 / P90)
  const mcCorridorOption = useMemo<EChartsOption>(() => {
    const pts = result.monteCarloCorridor;
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
      legend: {
        data: ['P90 乐观上沿', 'P75', 'P50 中位净值', 'P25', 'P10 悲观尾部'],
        textStyle: { color: '#94a3b8', fontSize: 10 },
        top: 0,
      },
      grid: { left: 46, right: 20, top: 34, bottom: 28 },
      xAxis: {
        type: 'category',
        data: pts.map((p) => p.label),
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
          name: 'P90 乐观上沿',
          type: 'line',
          smooth: true,
          data: pts.map((p) => p.p90),
          lineStyle: { color: '#34d399', width: 1.5, type: 'dashed' },
          itemStyle: { color: '#34d399' },
        },
        {
          name: 'P75',
          type: 'line',
          smooth: true,
          data: pts.map((p) => p.p75),
          lineStyle: { color: '#38bdf8', width: 1.2, opacity: 0.7 },
          symbol: 'none',
        },
        {
          name: 'P50 中位净值',
          type: 'line',
          smooth: true,
          data: pts.map((p) => p.p50),
          lineStyle: { color: '#22d3ee', width: 3 },
          itemStyle: { color: '#22d3ee' },
        },
        {
          name: 'P25',
          type: 'line',
          smooth: true,
          data: pts.map((p) => p.p25),
          lineStyle: { color: '#fbbf24', width: 1.2, opacity: 0.7 },
          symbol: 'none',
        },
        {
          name: 'P10 悲观尾部',
          type: 'line',
          smooth: true,
          data: pts.map((p) => p.p10),
          lineStyle: { color: '#f43f5e', width: 2, type: 'dashed' },
          itemStyle: { color: '#f43f5e' },
        },
      ],
    };
  }, [result.monteCarloCorridor]);

  const reitRow = result.allocations.find((a) => a.id === 'us-reits');

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header & Optimizer Controls */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono text-cyan-400 font-bold uppercase flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5" />
              Stage 07 · 资产配置优化器 (MVO / Risk Parity) & 1,000次蒙特卡洛走廊
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-0.5">
              从宏观 CME 预期落地到真实组合权重：检验估值平滑错配与尾部风险
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setMode('mvo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                mode === 'mvo'
                  ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              均值-方差优化 (MVO)
            </button>
            <button
              onClick={() => setMode('risk-parity')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                mode === 'risk-parity'
                  ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              风险平价 (Risk Parity ERC)
            </button>
            <button
              onClick={() => setIncludePesoJump((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                includePesoJump
                  ? 'bg-rose-950/70 border-rose-500/60 text-rose-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              Peso 尾部跳跃冲击: {includePesoJump ? '开启' : '关闭'}
            </button>
          </div>
        </div>

        {/* Sliders Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-800/80 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">风险厌恶系数 γ (MVO专用)</span>
              <span className="font-mono font-bold text-cyan-300">{riskAversionGamma.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={8.0}
              step={0.5}
              disabled={mode === 'risk-parity'}
              value={riskAversionGamma}
              onChange={(e) => setRiskAversionGamma(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:opacity-40"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">单资产最大权重上限</span>
              <span className="font-mono font-bold text-emerald-300">{(maxWeight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={0.8}
              step={0.05}
              value={maxWeight}
              onChange={(e) => setMaxWeight(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400">组合预期年化 / 真实回报</div>
              <div className="text-sm font-mono font-bold text-cyan-300">
                {formatPct(result.calibratedMetrics.expectedReturn)}{' '}
                <span className="text-xs text-emerald-300">
                  ({formatPct(result.calibratedMetrics.realReturn, 2, true)} 实际)
                </span>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400">真实波动率 / 夏普比 / CVaR95</div>
              <div className="text-xs font-mono font-bold text-amber-300">
                σ={formatPct(result.calibratedMetrics.trueVol)} · SR={result.calibratedMetrics.sharpeRatio.toFixed(2)} · CVaR={formatPct(result.calibratedMetrics.cvar95)}
              </div>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Bias Trap Alert Banner */}
      <div className="p-3.5 rounded-2xl bg-amber-950/25 border border-amber-700/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-200">偏差错配实证检验（对比图1估值平滑陷阱）：</strong>
            <span className="text-slate-300 ml-1">
              若直接把未去平滑的账面波动率与无条件历史均值喂给优化器，REITs/商业地产会被错误赋予{' '}
              <strong className="font-mono text-rose-300">{reitRow?.naiveWeightPct.toFixed(1)}%</strong> 仓位，并产生{' '}
              <strong className="font-mono text-rose-300">Sharpe = {result.naiveMetrics.apparentSharpe.toFixed(2)}</strong>{' '}
              的虚假幻觉（真实事后夏普比仅 <strong className="font-mono text-amber-300">{result.naiveMetrics.trueSharpe.toFixed(2)}</strong>）；经 Geltner 去平滑与条件收缩后，REITs 合理权重收敛至{' '}
              <strong className="font-mono text-emerald-300">{reitRow?.calibratedWeightPct.toFixed(1)}%</strong>。
            </span>
          </div>
        </div>
        <div className="font-mono text-[11px] bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 whitespace-nowrap flex-shrink-0">
          {inputs.horizonYears}年跑赢通胀概率:{' '}
          <strong className="text-emerald-300">{result.calibratedMetrics.probBeatInflation}%</strong>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-4 rounded-2xl">
          <h4 className="text-xs font-bold text-slate-200 mb-2">
            未校准输入 vs 校准后 CME 最优资产配置权重对比 (%)
          </h4>
          <EChartWrapper option={weightsChartOption} height="280px" />
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <h4 className="text-xs font-bold text-slate-200 mb-2">
            1,000 次蒙特卡洛净值概率走廊 ({inputs.horizonYears} 年期 · 初始净值 = 100 · {includePesoJump ? '含Peso尾部跳跃' : '纯高斯'})
          </h4>
          <EChartWrapper option={mcCorridorOption} height="280px" />
        </div>
      </div>

      {/* Allocation Detail Table */}
      <div className="glass-card p-4 rounded-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
              <th className="py-2 px-3">资产类别</th>
              <th className="py-2 px-3 text-right">未校准权重 (平滑陷阱)</th>
              <th className="py-2 px-3 text-right text-cyan-300">校准后最优权重</th>
              <th className="py-2 px-3 text-right">权重修正 Δ</th>
              <th className="py-2 px-3 text-right">风险贡献度 (Risk Contribution)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {result.allocations.map((row) => (
              <tr key={row.id} className="hover:bg-slate-900/60">
                <td className="py-2.5 px-3 font-semibold text-slate-100">
                  {row.chineseName}
                  <span className="block text-[10px] font-mono text-slate-500">{row.name}</span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                  {row.naiveWeightPct.toFixed(1)}%
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-300 text-sm">
                  {row.calibratedWeightPct.toFixed(1)}%
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-mono font-semibold ${
                    row.weightDeltaPct > 0
                      ? 'text-emerald-300'
                      : row.weightDeltaPct < 0
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {row.weightDeltaPct > 0 ? `+${row.weightDeltaPct.toFixed(1)}%` : `${row.weightDeltaPct.toFixed(1)}%`}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-amber-300">
                  {row.riskContributionPct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
