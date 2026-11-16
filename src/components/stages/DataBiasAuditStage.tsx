import React, { useMemo } from 'react';
import { MacroEngineOutput, MacroSimulationInputs, SampleWindowId } from '../../types/macro';
import { SAMPLE_WINDOW_STATS } from '../../utils/macroCmeEngine';
import { EChartWrapper } from '../EChartWrapper';
import { formatPct } from '../../utils/formatters';
import { ShieldAlert, Clock, AlertTriangle, BarChart3, CheckCircle2 } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface DataBiasAuditStageProps {
  inputs: MacroSimulationInputs;
  output: MacroEngineOutput;
  onUpdateInputs: (patch: Partial<MacroSimulationInputs>) => void;
}

export const DataBiasAuditStage: React.FC<DataBiasAuditStageProps> = ({
  inputs,
  output,
  onUpdateInputs,
}) => {
  // Chart 1: Vintage PIT vs Revised GDP Illusion + Sample Window Time-Period Bias
  const windowCompareOption = useMemo<EChartsOption>(() => {
    const keys = Object.keys(SAMPLE_WINDOW_STATS) as SampleWindowId[];
    const labels = keys.map((k) => SAMPLE_WINDOW_STATS[k].label.split(' ')[0]);
    const eqMeans = keys.map((k) => SAMPLE_WINDOW_STATS[k].equitiesMean);
    const bondMeans = keys.map((k) => SAMPLE_WINDOW_STATS[k].bondsMean);

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
      legend: { data: ['美股历史均值 (S&P 500)', '美债历史均值 (10Y UST)'], textStyle: { color: '#94a3b8', fontSize: 11 }, top: 0 },
      grid: { left: 42, right: 20, top: 34, bottom: 32 },
      xAxis: {
        type: 'category',
        data: labels,
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
          name: '美股历史均值 (S&P 500)',
          type: 'bar',
          data: eqMeans,
          itemStyle: { color: '#22d3ee', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '美债历史均值 (10Y UST)',
          type: 'bar',
          data: bondMeans,
          itemStyle: { color: '#34d399', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, []);

  // Chart 2: Geltner Appraisal Unsmoothing Volatility Comparison & Shrinkage Blend
  const unsmoothChartOption = useMemo<EChartsOption>(() => {
    const eq = output.assetForecasts.find((a) => a.id === 'us-equities')!;
    const ust = output.assetForecasts.find((a) => a.id === 'us-10y-treasury')!;
    const reit = output.assetForecasts.find((a) => a.id === 'us-reits')!;

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
      legend: { data: ['账面平滑波动率 (Reported)', '去平滑真实波动率 (True)'], textStyle: { color: '#94a3b8', fontSize: 11 }, top: 0 },
      grid: { left: 42, right: 20, top: 34, bottom: 28 },
      xAxis: {
        type: 'category',
        data: ['10Y 美债', 'REITs / 商业地产', 'S&P 500'],
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', formatter: '{value}%', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [
        {
          name: '账面平滑波动率 (Reported)',
          type: 'bar',
          data: [ust.reportedVol, reit.reportedVol, eq.reportedVol],
          itemStyle: { color: '#64748b', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '去平滑真实波动率 (True)',
          type: 'bar',
          data: [ust.trueUnsmoothedVol, reit.trueUnsmoothedVol, eq.trueUnsmoothedVol],
          itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [output]);

  const activeWindowMeta = SAMPLE_WINDOW_STATS[inputs.sampleWindowId];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono text-cyan-400 font-bold uppercase flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Stage 01 · 图1 资产配置预测中的 9 大挑战与偏差审计沙盒
          </div>
          <h2 className="text-lg font-bold text-slate-100 mt-0.5">
            经济数据局限性 · 历史估计非平稳性 · 数据挖掘与条件信息缺失
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            在生成任何美国资本市场预期之前，必须先审计样本窗口、数据修订滞后、估值平滑以及罕见尾部（Peso Problem）对历史统计量的扭曲。
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onUpdateInputs({ usePointInTimeData: !inputs.usePointInTimeData })}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${
              inputs.usePointInTimeData
                ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300'
                : 'bg-rose-950/60 border-rose-600/60 text-rose-300'
            }`}
          >
            {inputs.usePointInTimeData ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>
              {inputs.usePointInTimeData
                ? 'ALFRED Point-in-Time 初值模式 (无前瞻偏差)'
                : '最终修订数据模式 (+68 bps Look-ahead 幻觉)'}
            </span>
          </button>
        </div>
      </div>

      {/* Three Columns matching Image 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Limitations of Economic Data */}
        <div className="glass-card p-4 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase">Column A · 经济数据的局限性</span>
              <h3 className="text-sm font-bold text-slate-100">时间滞后 · 修订调整 · 估值平滑</h3>
            </div>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="font-bold text-slate-100">1. 时间滞后 (Time Lags)</div>
              <p className="text-[11px] text-slate-400 mt-1">
                美国 BEA GDP 初值滞后约 30 天、个人收支与生产力报告滞后 1–2 个月，导致同步指标在拐点处已过时。
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-100">2. 修订与基准调整 (Revisions)</span>
                <span className="font-mono text-[10px] text-amber-300">
                  误差 {output.biasAudit.pitVsRevisedGdpErrorBps} bps
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                当前选用 <span className="text-cyan-300 font-semibold">{inputs.usePointInTimeData ? 'PIT 时点初值' : '最终修订终值'}</span>。用修订后历史建立的交易模型会严重高估实盘夏普比率。
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-700/40 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-200">3. Geltner 估值去平滑 (Appraisal Smoothing)</span>
                <span className="font-mono text-[11px] text-amber-300">
                  α = {inputs.appraisalSmoothingAlpha.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1.0}
                step={0.05}
                value={inputs.appraisalSmoothingAlpha}
                onChange={(e) => onUpdateInputs({ appraisalSmoothingAlpha: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                <div className="bg-slate-900 p-2 rounded-lg">
                  <div className="text-[10px] text-slate-400">账面波动率 σ_rep</div>
                  <div className="text-slate-200 font-bold">{formatPct(output.biasAudit.rawReitVol)}</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-amber-700/40">
                  <div className="text-[10px] text-amber-300">去平滑真实 σ_true</div>
                  <div className="text-amber-300 font-bold">{formatPct(output.biasAudit.unsmoothedReitVol)}</div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                商业地产/私募估值滞后导致表观波动率被低估 <strong className="text-amber-300">{output.biasAudit.smoothingVolUnderstatementPct}%</strong>，虚假夸大夏普比。
              </p>
            </div>
          </div>
        </div>

        {/* Column 2: Limitations of Historical Estimates */}
        <div className="glass-card p-4 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] font-mono text-purple-400 uppercase">Column B · 历史估计的局限性</span>
              <h3 className="text-sm font-bold text-slate-100">体制变革 · 异步数据 · 比索问题</h3>
            </div>
            <AlertTriangle className="w-4 h-4 text-purple-400" />
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="font-bold text-slate-100">1. 体制变革与非平稳性 (Regime Changes)</div>
              <p className="text-[11px] text-slate-400 mt-1">
                2008 ZIRP、2020 疫情与 2022 再通胀标志着结构断点。当前窗口注记：
                <span className="text-purple-300 block mt-1">{activeWindowMeta.regimeBreakNote}</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-100">2. 异步数据 (Asynchronous Data)</span>
                <span className="font-mono text-[10px] text-cyan-300">
                  上报 {output.biasAudit.asyncVsSyncedEquityBondCorr.asyncReported} vs 真实{' '}
                  {output.biasAudit.asyncVsSyncedEquityBondCorr.trueSynced}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                跨市场时区错配或季/月频混合采样会系统性压低真实相关性（向零衰减），并制造虚假领先-滞后假象。
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-700/40 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-rose-200">3. 比索问题 (The "Peso Problem")</span>
                <span className="font-mono text-[11px] text-rose-300">
                  尾部概率 {(inputs.pesoTailProb * 100).toFixed(1)}% / 年
                </span>
              </div>
              <input
                type="range"
                min={0.0}
                max={0.12}
                step={0.01}
                value={inputs.pesoTailProb}
                onChange={(e) => onUpdateInputs({ pesoTailProb: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">事前风险溢价扣除:</span>
                <span className="text-rose-300 font-bold">-{formatPct(output.biasAudit.pesoAnnualDragPct)} / 年</span>
              </div>
              <p className="text-[10px] text-slate-400">
                若历史样本恰好未包含罕见灾难（如1929或2008级别流动性枯竭），直接用历史均值会严重低估事前风险。
              </p>
            </div>
          </div>
        </div>

        {/* Column 3: Data-Mining & Method Biases */}
        <div className="glass-card p-4 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase">Column C · 数据挖掘与方法偏差</span>
              <h3 className="text-sm font-bold text-slate-100">时间跨度偏差 · 条件收缩 λ</h3>
            </div>
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
              <div className="font-bold text-slate-100">1. 时间跨度偏差 (Time-Period Bias) — 切换美国样本期</div>
              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(SAMPLE_WINDOW_STATS) as SampleWindowId[]).map((winId) => {
                  const meta = SAMPLE_WINDOW_STATS[winId];
                  const selected = inputs.sampleWindowId === winId;
                  return (
                    <button
                      key={winId}
                      onClick={() => onUpdateInputs({ sampleWindowId: winId })}
                      className={`text-left px-2.5 py-1.5 rounded-lg border text-[11px] flex justify-between items-center transition-all ${
                        selected
                          ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-200 font-semibold'
                          : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate pr-2">{meta.label}</span>
                      <span className="font-mono text-[10px] flex-shrink-0">
                        股 {meta.equitiesMean}% / 债 {meta.bondsMean}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-700/40 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-emerald-200">2. 条件信息收缩权重 (Conditioning Shrinkage λ)</span>
                <span className="font-mono text-[11px] text-emerald-300">λ = {inputs.shrinkageLambda.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.05}
                value={inputs.shrinkageLambda}
                onChange={(e) => onUpdateInputs({ shrinkageLambda: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-[10px] text-slate-400 font-mono">
                E(R)_blended = {inputs.shrinkageLambda.toFixed(2)} × 条件预期 + {(1 - inputs.shrinkageLambda).toFixed(2)} × 无条件历史均值
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="font-bold text-slate-100">3. 数据挖掘偏差 ("No Story, No Future")</div>
              <p className="text-[11px] text-slate-400 mt-1">
                若某个统计规律缺乏清晰经济传导机制（例如本工作台中的泰勒规则、Solow拆解或双赤字恒等式），则大概率是样本内过拟合噪音。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-4 rounded-2xl">
          <h4 className="text-xs font-bold text-slate-200 mb-2">
            时间跨度敏感度：美国股债在不同历史区制下的名义均值剧变 (%)
          </h4>
          <EChartWrapper option={windowCompareOption} height="240px" />
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <h4 className="text-xs font-bold text-slate-200 mb-2">
            Geltner 去平滑前后波动率对比：警惕 REITs/私募房地产虚假低波动陷阱 (%)
          </h4>
          <EChartWrapper option={unsmoothChartOption} height="240px" />
        </div>
      </div>
    </div>
  );
};
