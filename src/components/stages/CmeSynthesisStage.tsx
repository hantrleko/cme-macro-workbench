import React, { useMemo } from 'react';
import { MacroEngineOutput, MacroSimulationInputs } from '../../types/macro';
import { EChartWrapper } from '../EChartWrapper';
import { formatPct } from '../../utils/formatters';
import { Layers, FileSpreadsheet, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface CmeSynthesisStageProps {
  inputs: MacroSimulationInputs;
  output: MacroEngineOutput;
  onUpdateInputs: (patch: Partial<MacroSimulationInputs>) => void;
  onOpenSevenStepModal: () => void;
}

export const CmeSynthesisStage: React.FC<CmeSynthesisStageProps> = ({
  inputs,
  output,
  onUpdateInputs,
  onOpenSevenStepModal,
}) => {
  // Chart 1: Efficient Frontier Scatter (True Unsmoothed Vol vs Blended Expected Return)
  const frontierOption = useMemo<EChartsOption>(() => {
    const points = output.assetForecasts.map((a) => ({
      name: a.chineseName,
      value: [a.trueUnsmoothedVol, a.blendedExpectedReturn, a.sharpeRatio],
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (p: unknown) => {
          const item = p as { name: string; value: [number, number, number] };
          return `<strong>${item.name}</strong><br/>预期年化回报: ${item.value[1].toFixed(2)}%<br/>真实波动率 σ: ${item.value[0].toFixed(2)}%<br/>夏普比 Sharpe: ${item.value[2].toFixed(2)}`;
        },
      },
      grid: { left: 48, right: 26, top: 24, bottom: 36 },
      xAxis: {
        type: 'value',
        name: '真实波动率 σ (%)',
        nameLocation: 'middle',
        nameGap: 24,
        nameTextStyle: { color: '#94a3b8', fontSize: 10 },
        axisLabel: { color: '#94a3b8', formatter: '{value}%', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'value',
        name: '混合预期回报 E(R) (%)',
        nameTextStyle: { color: '#94a3b8', fontSize: 10 },
        axisLabel: { color: '#94a3b8', formatter: '{value}%', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: 15,
          data: points,
          itemStyle: {
            color: '#22d3ee',
            borderColor: '#ffffff',
            borderWidth: 1.5,
          },
          label: {
            show: true,
            position: 'top',
            formatter: '{b}',
            color: '#cbd5e1',
            fontSize: 10,
          },
        },
      ],
    };
  }, [output.assetForecasts]);

  // Chart 2: 7x7 Cross-Asset Correlation Heatmap
  const corrHeatmapOption = useMemo<EChartsOption>(() => {
    const labels = output.correlationLabels;
    const data: Array<[number, number, number]> = [];
    for (let i = 0; i < labels.length; i++) {
      for (let j = 0; j < labels.length; j++) {
        data.push([j, i, output.correlationMatrix[i][j]]);
      }
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0' },
      },
      grid: { left: 68, right: 20, top: 14, bottom: 52 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 25 },
        splitArea: { show: true },
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitArea: { show: true },
      },
      visualMap: {
        min: -0.4,
        max: 1.0,
        show: false,
        inRange: {
          color: ['#f43f5e', '#334155', '#0ea5e9', '#22d3ee'],
        },
      },
      series: [
        {
          type: 'heatmap',
          data,
          label: {
            show: true,
            color: '#f8fafc',
            fontSize: 10,
            fontFamily: 'JetBrains Mono',
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  }, [output.correlationLabels, output.correlationMatrix]);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono text-emerald-400 font-bold uppercase flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Stage 06 · 图2 资本市场预期7步法综合输出 ({inputs.horizonYears} 年期美国资产预测表)
          </div>
          <h2 className="text-lg font-bold text-slate-100 mt-0.5">
            美国 7 大资产类别收益/波动/夏普期望矩阵与条件相关性图谱
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            综合了偏差校准 (λ={inputs.shrinkageLambda.toFixed(2)} / Geltner α={inputs.appraisalSmoothingAlpha.toFixed(2)})、Solow 锚定、周期 5 阶段、泰勒规则及双赤字约束。
          </p>
        </div>

        <button
          onClick={onOpenSevenStepModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 transition-all flex-shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>生成 7 步投研备忘录 & 第 7 步结果反馈</span>
        </button>
      </div>

      {/* Main 7-Asset CME Table */}
      <div className="glass-card p-4 rounded-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
              <th className="py-2.5 px-3">美国大类资产 (Asset Class)</th>
              <th className="py-2.5 px-3 text-right">无条件均值</th>
              <th className="py-2.5 px-3 text-right">条件预期</th>
              <th className="py-2.5 px-3 text-right text-cyan-300">混合预期 E(R)</th>
              <th className="py-2.5 px-3 text-right">预期真实回报</th>
              <th className="py-2.5 px-3 text-right">真实波动率 σ</th>
              <th className="py-2.5 px-3 text-right">夏普比</th>
              <th className="py-2.5 px-3">周期建议</th>
              <th className="py-2.5 px-3">通胀情景评估与归因</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {output.assetForecasts.map((asset) => (
              <tr key={asset.id} className="hover:bg-slate-900/60 transition-colors">
                <td className="py-3 px-3">
                  <div className="font-bold text-slate-100">{asset.chineseName}</div>
                  <div className="text-[10px] font-mono text-slate-500">{asset.name}</div>
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-400">
                  {formatPct(asset.unconditionalReturn)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-200">
                  {formatPct(asset.conditionalReturn)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300 text-sm">
                  {formatPct(asset.blendedExpectedReturn)}
                </td>
                <td
                  className={`py-3 px-3 text-right font-mono font-semibold ${
                    asset.expectedRealReturn >= 0 ? 'text-emerald-300' : 'text-rose-400'
                  }`}
                >
                  {formatPct(asset.expectedRealReturn, 2, true)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-amber-300">
                  {formatPct(asset.trueUnsmoothedVol, 1)}
                  {asset.id === 'us-reits' && (
                    <span className="block text-[9px] text-slate-500">账面 {asset.reportedVol}%</span>
                  )}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-100">
                  {asset.sharpeRatio.toFixed(2)}
                </td>
                <td className="py-3 px-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      asset.cycleVerdict === 'Overweight'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                        : asset.cycleVerdict === 'Underweight'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-700/50'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {asset.cycleVerdict === 'Overweight' && <ArrowUpRight className="w-3 h-3" />}
                    {asset.cycleVerdict === 'Underweight' && <ArrowDownRight className="w-3 h-3" />}
                    {asset.cycleVerdict === 'Neutral' && <Minus className="w-3 h-3" />}
                    {asset.cycleVerdict}
                  </span>
                </td>
                <td className="py-3 px-3 max-w-xs">
                  <div className="text-[11px] text-slate-200 font-medium">{asset.inflationScenarioVerdict}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{asset.driverAttribution}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts Row: Risk-Return Scatter & 7x7 Correlation Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-4 rounded-2xl">
          <h4 className="text-xs font-bold text-slate-200 mb-2">
            美国 7 大资产类别 风险-收益散点图 (去平滑真实 σ vs 混合预期回报)
          </h4>
          <EChartWrapper option={frontierOption} height="280px" />
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <h4 className="text-xs font-bold text-slate-200 mb-2">
            7×7 条件相关性矩阵 (股债相关性随通胀情景动态切换正负)
          </h4>
          <EChartWrapper option={corrHeatmapOption} height="280px" />
        </div>
      </div>

      {/* v2.0 CME Part 2: Asset-Class Specific Pricing Building Blocks */}
      <div className="glass-card p-4 rounded-2xl space-y-4 border border-indigo-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div>
            <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold">
              v2.0 CME Part 2 · 股 / 债 / 房 专属结构化定价模型 (Building Blocks)
            </span>
            <h3 className="text-sm font-bold text-slate-100 mt-0.5">
              Grinold-Kroner 股票拆解 · Singer-Terhaar 跨国一体化 · 债券收益积木 · 商业地产 Cap Rate 模型
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
          {/* 1. Equities: Grinold-Kroner & Singer-Terhaar */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-cyan-300">1. 美股 Grinold-Kroner & Singer-Terhaar</span>
              <span className="font-mono font-bold text-white">
                {formatPct(output.part2BuildingBlocks.equitiesGrinoldKroner.grinoldKronerTotal)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              <div className="bg-slate-900 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">股息率 D/P</span>
                <span className="text-cyan-300 font-bold">
                  +{output.part2BuildingBlocks.equitiesGrinoldKroner.dividendYield.toFixed(2)}%
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">净回购 (-ΔS)</span>
                <span className="text-emerald-300 font-bold">
                  +{output.part2BuildingBlocks.equitiesGrinoldKroner.netBuybackYield.toFixed(2)}%
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">实际盈利 + 通胀</span>
                <span className="text-slate-200 font-bold">
                  +{(
                    output.part2BuildingBlocks.equitiesGrinoldKroner.realEarningsGrowth +
                    output.part2BuildingBlocks.equitiesGrinoldKroner.inflationContrib
                  ).toFixed(2)}%
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">估值变化 ΔP/E</span>
                <span
                  className={`font-bold ${
                    output.part2BuildingBlocks.equitiesGrinoldKroner.peReRating >= 0
                      ? 'text-emerald-300'
                      : 'text-rose-400'
                  }`}
                >
                  {formatPct(output.part2BuildingBlocks.equitiesGrinoldKroner.peReRating, 2, true)}
                </span>
              </div>
            </div>

            <div className="pt-1 border-t border-slate-800 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">Singer-Terhaar 一体化程度 φ</span>
                <span className="font-mono text-indigo-300 font-bold">
                  {(inputs.globalIntegrationPhi ?? 0.85).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={inputs.globalIntegrationPhi ?? 0.85}
                onChange={(e) => onUpdateInputs({ globalIntegrationPhi: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-[11px] font-mono text-slate-400">
                Singer-Terhaar ERP:{' '}
                <strong className="text-indigo-300">
                  {formatPct(output.part2BuildingBlocks.equitiesGrinoldKroner.singerTerhaarErp)}
                </strong>{' '}
                (总预期 {formatPct(output.part2BuildingBlocks.equitiesGrinoldKroner.singerTerhaarTotal)})
              </div>
            </div>
          </div>

          {/* 2. Fixed Income Building Blocks */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-300">2. 固定收益 Building Blocks</span>
              <span className="font-mono text-[11px] text-slate-400">
                预期曲线平移 {(inputs.expectedCurveShiftBps ?? 0) >= 0 ? '+' : ''}
                {inputs.expectedCurveShiftBps ?? 0} bps
              </span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              step={10}
              value={inputs.expectedCurveShiftBps ?? 0}
              onChange={(e) => onUpdateInputs({ expectedCurveShiftBps: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="space-y-1.5 text-[11px]">
              {output.part2BuildingBlocks.fixedIncomeBlocks.map((b) => (
                <div key={b.id} className="bg-slate-900/90 p-2 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-200">{b.name}</span>
                    <span className="font-mono text-emerald-300">{formatPct(b.totalReturn)}</span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                    票息 {b.yieldIncome.toFixed(2)}% + 骑乘 {b.rolldownReturn.toFixed(2)}% + 久期{' '}
                    {b.durationPriceEffect >= 0 ? '+' : ''}
                    {b.durationPriceEffect.toFixed(2)}% − 违约 {Math.abs(b.creditLossDrag).toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Real Estate: Cap Rate + NOI Model */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-amber-300">3. 商业地产 Cap Rate + NOI 模型</span>
              <span className="font-mono font-bold text-amber-200">
                {formatPct(output.part2BuildingBlocks.realEstateCapRate.totalReturn)}
              </span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">初始资本化率 (Going-in Cap Rate)</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {(inputs.reitCapRate ?? 5.4).toFixed(2)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={3.5}
                  max={8.5}
                  step={0.1}
                  value={inputs.reitCapRate ?? 5.4}
                  onChange={(e) => onUpdateInputs({ reitCapRate: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">Cap Rate 压缩(+)/扩张(-) 估值效应</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {(inputs.reitCapRateChangeAnnual ?? 0).toFixed(2)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-2.5}
                  max={2.5}
                  step={0.1}
                  value={inputs.reitCapRateChangeAnnual ?? 0}
                  onChange={(e) => onUpdateInputs({ reitCapRateChangeAnnual: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Cap Rate 现金收益:</span>
                <span className="text-slate-200">{output.part2BuildingBlocks.realEstateCapRate.goingInCapRate.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">NOI 净营运收入增长:</span>
                <span className="text-emerald-300">+{output.part2BuildingBlocks.realEstateCapRate.noiGrowth.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cap Rate 变动资本利得:</span>
                <span className={output.part2BuildingBlocks.realEstateCapRate.capRateValuationEffect >= 0 ? 'text-emerald-300' : 'text-rose-400'}>
                  {formatPct(output.part2BuildingBlocks.realEstateCapRate.capRateValuationEffect, 2, true)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
