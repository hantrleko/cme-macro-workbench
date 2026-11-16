import React, { useState } from 'react';
import { MacroEngineOutput, MacroRegimePreset, MacroSimulationInputs } from '../types/macro';
import { BUSINESS_CYCLE_PHASES, SAMPLE_WINDOW_STATS_UI_MAP } from './cmeHelperMaps';
import { simulateCmeOutcomeFeedback } from '../utils/macroCmeEngine';
import { formatPct, formatBps } from '../utils/formatters';
import { X, CheckCircle2, FileDown, RefreshCw, AlertCircle } from 'lucide-react';

interface CmeSevenStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  preset: MacroRegimePreset;
  inputs: MacroSimulationInputs;
  output: MacroEngineOutput;
}

type RealizedShockChoice =
  | 'inline-consensus'
  | 'ai-productivity-beat'
  | 'stagflation-surprise'
  | 'recession-hard-landing';

export const CmeSevenStepModal: React.FC<CmeSevenStepModalProps> = ({
  isOpen,
  onClose,
  preset,
  inputs,
  output,
}) => {
  const [realizedChoice, setRealizedChoice] = useState<RealizedShockChoice>('inline-consensus');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const feedback = simulateCmeOutcomeFeedback(inputs, output, realizedChoice);
  const cycleMeta = BUSINESS_CYCLE_PHASES.find((p) => p.id === inputs.cyclePhase);
  const eq = output.assetForecasts.find((a) => a.id === 'us-equities')!;
  const ust = output.assetForecasts.find((a) => a.id === 'us-10y-treasury')!;
  const reit = output.assetForecasts.find((a) => a.id === 'us-reits')!;

  const buildMarkdownReport = () => {
    const lines = [
      `# 美国资本市场预期 (CME) 投研备忘录 — ${preset.name}`,
      `- 生成视野: ${inputs.horizonYears} 年期 | 商业周期定位: ${cycleMeta?.name ?? inputs.cyclePhase}`,
      `- 泰勒规则隐含利率 i*: ${output.policy.taylorImpliedRate}% vs 实际联邦基金利率: ${inputs.actualFedFundsRate}% (${formatBps(output.policy.policyGapBps)})`,
      `- 潜在实际GDP增速: ${output.shockAdjustedRealGdp}% | 名义GDP锚: ${output.nominalTrendGdp}%`,
      `- 国民收入镜像恒等式: 经常账户 (X-M) = ${output.international.currentAccountPctGdp}% GDP (S-I = ${output.international.netPrivateSavingPctGdp}%, T-G = ${output.international.fiscalBalancePctGdp}%)`,
      ``,
      `## 核心资产预期表 (经 Shrinkage λ=${inputs.shrinkageLambda} 与去平滑 α=${inputs.appraisalSmoothingAlpha} 校准)`,
      `| 资产类别 | 无条件均值 | 条件预期 | 混合预期 E(R) | 真实波动率 σ | 夏普比 |`,
      `| --- | --- | --- | --- | --- | --- |`,
      ...output.assetForecasts.map(
        (a) =>
          `| ${a.chineseName} | ${a.unconditionalReturn}% | ${a.conditionalReturn}% | ${a.blendedExpectedReturn}% | ${a.trueUnsmoothedVol}% | ${a.sharpeRatio} |`
      ),
      ``,
      `## Step 7 监控与反馈归因 (${realizedChoice})`,
      ...feedback.attributionNotes.map((n) => `- ${n}`),
    ];
    return lines.join('\n');
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard?.writeText(buildMarkdownReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      num: 'STEP 1',
      title: '明确所需的预期 (Specify Expectations Needed)',
      detail: `聚焦美国7大核心资产类别（Cash / 10Y UST / TIPS / IG / HY / S&P 500 / REITs），锁定 ${inputs.horizonYears} 年期美元名义与实际回报预期。`,
    },
    {
      num: 'STEP 2',
      title: '研究历史记录 (Research Historical Record)',
      detail: `已选参考窗口：${SAMPLE_WINDOW_STATS_UI_MAP[inputs.sampleWindowId] ?? inputs.sampleWindowId}（美股历史均值 ${output.biasAudit.sampleWindowEquitiesMean}%、美债 ${output.biasAudit.sampleWindowBondsMean}%），并对REITs执行Geltner去平滑（σ 从 ${output.biasAudit.rawReitVol}% 还原至 ${output.biasAudit.unsmoothedReitVol}%）。`,
    },
    {
      num: 'STEP 3',
      title: '确定方法与模型 (Specify Methods & Models)',
      detail: `采用 Solow 增长分解 + 股票锚定 (V_e = GDP × S_k × PE) + 泰勒规则 + 三合一预测集成（计量 ${(inputs.modelWeights.econometric * 100).toFixed(0)}% / LEI ${(inputs.modelWeights.leiNowcast * 100).toFixed(0)}% / 清单 ${(inputs.modelWeights.checklist * 100).toFixed(0)}%）。`,
    },
    {
      num: 'STEP 4',
      title: '确定信息来源 (Determine Information Sources)',
      detail: `${inputs.usePointInTimeData ? '启用 ALFRED Point-in-Time 初值快照规避前瞻偏差' : '警告：当前处于修订后数据模式，存在约 68 bps 前瞻偏差'}；关联 BEA / BLS / Federal Reserve / US Treasury FRED 官方数据规范。`,
    },
    {
      num: 'STEP 5',
      title: '解读当前投资环境 (Interpret Investment Environment)',
      detail: `当前定位：${cycleMeta?.name}，2×2 政策组合为「${output.policy.policyMixQuadrant}」，2s10s 利差 ${formatPct(output.policy.slope10Y2Y, 2, true)}，衰退概率 ${output.forecasting.recessionProbability}%。`,
    },
    {
      num: 'STEP 6',
      title: '提供预期并记录存档 (Provide Expectations & Document)',
      detail: `输出混合预期：S&P 500 ${formatPct(eq.blendedExpectedReturn)} (ERP ${formatPct(output.equityRiskPremium, 2, true)})，10Y 美债 ${formatPct(ust.blendedExpectedReturn)}，REITs ${formatPct(reit.blendedExpectedReturn)}。`,
    },
    {
      num: 'STEP 7',
      title: '监控实际结果与反馈 (Monitor Outcomes & Feedback)',
      detail: `在下方可切换不同现实意外情景，对比预期与事后实现值，完成图2第7步闭环误差归因。`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-emerald-400 font-bold uppercase">
              图 2 总纲闭环 · 7-Step CME Institutional Workflow
            </div>
            <h2 className="text-base font-bold text-slate-100">
              资本市场预期 7 步法投研备忘录与第 7 步反馈复盘
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-all"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{copied ? '已复制 Markdown 报告' : '导出 Markdown 备忘录'}</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* 7 Steps Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {steps.map((s) => (
              <div key={s.num} className="glass-card p-3.5 rounded-xl border border-slate-800/90 flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-cyan-400">{s.num}</span>
                    <span className="text-xs font-bold text-slate-100">{s.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Step 7 Feedback Simulator */}
          <div className="glass-card p-4 rounded-xl border border-amber-700/40 bg-amber-950/15 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-amber-200 uppercase font-mono">
                  STEP 7 事后结果监控与误差归因模拟器 (Monitor & Feedback Loop)
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'inline-consensus', label: '基本符合预期' },
                  { id: 'ai-productivity-beat', label: 'AI TFP超预期' },
                  { id: 'stagflation-surprise', label: '意外滞胀冲击' },
                  { id: 'recession-hard-landing', label: '硬着陆衰退' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setRealizedChoice(opt.id as RealizedShockChoice)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      realizedChoice === opt.id
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">预期 vs 实际美股回报</div>
                <div className="text-xs font-mono font-bold mt-0.5">
                  <span className="text-slate-300">{formatPct(eq.blendedExpectedReturn)}</span>
                  <span className="text-slate-500 mx-1">→</span>
                  <span className={feedback.realizedEquityReturn >= 0 ? 'text-emerald-300' : 'text-rose-400'}>
                    {formatPct(feedback.realizedEquityReturn)}
                  </span>
                </div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">美股预测误差</div>
                <div
                  className={`text-xs font-mono font-bold mt-0.5 ${
                    feedback.forecastErrorEquityBps >= 0 ? 'text-emerald-300' : 'text-rose-400'
                  }`}
                >
                  {formatBps(feedback.forecastErrorEquityBps)}
                </div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">预期 vs 实际10Y美债</div>
                <div className="text-xs font-mono font-bold mt-0.5">
                  <span className="text-slate-300">{formatPct(ust.blendedExpectedReturn)}</span>
                  <span className="text-slate-500 mx-1">→</span>
                  <span className={feedback.realizedBondReturn >= 0 ? 'text-emerald-300' : 'text-rose-400'}>
                    {formatPct(feedback.realizedBondReturn)}
                  </span>
                </div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">10Y美债预测误差</div>
                <div
                  className={`text-xs font-mono font-bold mt-0.5 ${
                    feedback.forecastErrorBondBps >= 0 ? 'text-emerald-300' : 'text-rose-400'
                  }`}
                >
                  {formatBps(feedback.forecastErrorBondBps)}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              {feedback.attributionNotes.map((note, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
