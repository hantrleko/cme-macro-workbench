import React, { useMemo } from 'react';
import { FredQuarterlyRecord, MacroEngineOutput, MacroSimulationInputs, PolicyStance } from '../../types/macro';
import { EChartWrapper } from '../EChartWrapper';
import { formatBps, formatPct } from '../../utils/formatters';
import { Scale, ZapOff, ShieldAlert, TrendingUp } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface PolicyAndYieldCurveStageProps {
  inputs: MacroSimulationInputs;
  output: MacroEngineOutput;
  onUpdateInputs: (patch: Partial<MacroSimulationInputs>) => void;
  activeFredRecord?: FredQuarterlyRecord | null;
}

export const PolicyAndYieldCurveStage: React.FC<PolicyAndYieldCurveStageProps> = ({
  inputs,
  output,
  onUpdateInputs,
  activeFredRecord,
}) => {
  // Yield Curve Chart (3M -> 30Y)
  const yieldCurveOption = useMemo<EChartsOption>(() => {
    const tenors = output.policy.yieldCurve.map((p) => p.tenor);
    const legendItems = ['当前仿真美债曲线', '无QE/LDI反事实曲线', '商业周期基准曲线'];
    const seriesList: EChartsOption['series'] = [
      {
        name: '当前仿真美债曲线',
        type: 'line',
        smooth: true,
        data: output.policy.yieldCurve.map((p) => p.simulatedYield),
        lineStyle: { color: '#22d3ee', width: 3 },
        itemStyle: { color: '#22d3ee' },
        symbolSize: 8,
      },
      {
        name: '无QE/LDI反事实曲线',
        type: 'line',
        smooth: true,
        data: output.policy.yieldCurve.map((p) => p.noQeCounterfactualYield),
        lineStyle: { color: '#a78bfa', width: 2, type: 'dashed' },
        itemStyle: { color: '#a78bfa' },
      },
      {
        name: '商业周期基准曲线',
        type: 'line',
        smooth: true,
        data: output.policy.yieldCurve.map((p) => p.cycleBenchmarkYield),
        lineStyle: { color: '#64748b', width: 1.5, type: 'dotted' },
        itemStyle: { color: '#64748b' },
      },
    ];

    if (activeFredRecord) {
      const fredLabel = `FRED真实美债 (${activeFredRecord.quarter})`;
      legendItems.unshift(fredLabel);
      seriesList.unshift({
        name: fredLabel,
        type: 'line',
        smooth: true,
        data: tenors.map((t) => activeFredRecord.curve[t as keyof FredQuarterlyRecord['curve']]),
        lineStyle: { color: '#34d399', width: 3.5 },
        itemStyle: { color: '#34d399' },
        symbol: 'diamond',
        symbolSize: 9,
      });
    }

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
      legend: {
        data: legendItems,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 0,
      },
      grid: { left: 45, right: 20, top: 36, bottom: 28 },
      xAxis: {
        type: 'category',
        data: tenors,
        axisLabel: { color: '#cbd5e1', fontSize: 11 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', formatter: '{value}%', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: seriesList,
    };
  }, [output.policy.yieldCurve, activeFredRecord]);

  const policyMixCells: Array<{
    fiscal: PolicyStance;
    monetary: PolicyStance;
    title: string;
    real: string;
    inf: string;
    nominal: string;
  }> = [
    {
      fiscal: 'loose',
      monetary: 'loose',
      title: '双松政策 (Loose Fiscal + Loose Monetary)',
      real: '高实际利率',
      inf: '高通胀预期',
      nominal: '高名义利率',
    },
    {
      fiscal: 'tight',
      monetary: 'loose',
      title: '紧财松币 (Tight Fiscal + Loose Monetary)',
      real: '低实际利率',
      inf: '高通胀预期',
      nominal: '中等名义利率',
    },
    {
      fiscal: 'loose',
      monetary: 'tight',
      title: '松财紧币 (Loose Fiscal + Tight Monetary)',
      real: '高实际利率',
      inf: '低通胀预期',
      nominal: '中等名义利率',
    },
    {
      fiscal: 'tight',
      monetary: 'tight',
      title: '双紧政策 (Tight Fiscal + Tight Monetary)',
      real: '低实际利率',
      inf: '低通胀预期',
      nominal: '低名义利率',
    },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Row 1: Image 7 (Taylor Rule + Monetary/Fiscal Mechanics) & Image 8 (ZIRP/QE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Taylor Rule Calculator */}
        <div className="lg:col-span-6 glass-card p-4 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] font-mono text-amber-400 uppercase">图7 · 货币政策与泰勒规则</span>
              <h3 className="text-sm font-bold text-slate-100">
                Taylor Rule 交互式联邦基金利率锚定仪
              </h3>
            </div>
            <Scale className="w-4 h-4 text-amber-400" />
          </div>

          {/* Exact Formula Display */}
          <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 font-mono text-xs space-y-1.5">
            <div className="text-slate-400 text-[11px]">
              i* = r_neutral + π_e + 0.5(Y_e − Y_trend) + 0.5(π_e − π_target)
            </div>
            <div className="text-cyan-300 font-bold">
              i* = {inputs.neutralRealRate.toFixed(2)}% + {inputs.expectedInflation.toFixed(2)}% + 0.5(
              {inputs.outputGap.toFixed(2)}%) + 0.5({inputs.expectedInflation.toFixed(2)}% −{' '}
              {inputs.targetInflation.toFixed(2)}%) ={' '}
              <span className="text-amber-300 text-sm">{formatPct(output.policy.taylorImpliedRate)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">泰勒规则 i*</div>
              <div className="text-sm font-bold text-amber-300">{formatPct(output.policy.taylorImpliedRate)}</div>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">实际 Fed Funds</div>
              <div className="text-sm font-bold text-cyan-300">{formatPct(inputs.actualFedFundsRate)}</div>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">政策偏离度</div>
              <div
                className={`text-sm font-bold ${
                  Math.abs(output.policy.policyGapBps) >= 75 ? 'text-rose-400' : 'text-emerald-300'
                }`}
              >
                {formatBps(output.policy.policyGapBps)}
              </div>
            </div>
          </div>

          {/* Taylor Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              { label: '中性实际利率 r_neutral', key: 'neutralRealRate' as const, min: -0.5, max: 3.5, step: 0.05 },
              { label: '目标通胀 π_target', key: 'targetInflation' as const, min: 1.5, max: 3.5, step: 0.25 },
              { label: '预期通胀 π_e', key: 'expectedInflation' as const, min: -1.5, max: 9.5, step: 0.1 },
              { label: '产出缺口 (Y_e - Y_trend)', key: 'outputGap' as const, min: -6.0, max: 4.0, step: 0.1 },
              { label: '联邦基金政策利率', key: 'actualFedFundsRate' as const, min: -0.75, max: 10.0, step: 0.25 },
            ].map((s) => (
              <div key={s.key} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">{s.label}</span>
                  <span className="font-mono font-bold text-amber-300">{inputs[s.key].toFixed(2)}%</span>
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

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-[11px]">
            <div className="font-bold text-slate-200">
              立场诊断：<span className="text-amber-300">{output.policy.policyBiasLabel}</span>
            </div>
            <p className="text-slate-400">{output.policy.stringAsymmetryState}</p>
            <p className="text-slate-400">
              <strong className="text-cyan-300">自动稳定器：</strong>
              美国累进所得税制（扩张期自动多征、衰退期自动减税）与需求导向转移支付（失业救济）无需国会漫长立法即可逆周期缓冲可支配收入。
            </p>
          </div>
        </div>

        {/* Image 8: ZIRP / NIRP / QE Distortion Lab */}
        <div className="lg:col-span-6 glass-card p-4 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] font-mono text-purple-400 uppercase">图8 · 零/负利率与量化宽松 (QE)</span>
              <h3 className="text-sm font-bold text-slate-100">
                ZLB 突破机制 · QE 扭曲修正 · CME 4大核心考虑因素
              </h3>
            </div>
            <ZapOff className="w-4 h-4 text-purple-400" />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onUpdateInputs({ zirpNirpMode: !inputs.zirpNirpMode })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                inputs.zirpNirpMode
                  ? 'bg-purple-950/70 border-purple-500/70 text-purple-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              ZIRP / NIRP 零下限模式: {inputs.zirpNirpMode ? '已激活' : '关闭'}
            </button>
            <button
              onClick={() => onUpdateInputs({ qeActive: !inputs.qeActive })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                inputs.qeActive
                  ? 'bg-cyan-950/70 border-cyan-500/70 text-cyan-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              量化宽松 QE (-75bps 长端压制): {inputs.qeActive ? '进行中' : '退出/QT'}
            </button>
            <button
              onClick={() => onUpdateInputs({ ldiPensionDemand: !inputs.ldiPensionDemand })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                inputs.ldiPensionDemand
                  ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              养老金 LDI 负债匹配特例: {inputs.ldiPensionDemand ? '开启' : '关闭'}
            </button>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">存款便利价值 vs 现金摩擦下限 (Cash Friction Bound)</span>
              <span className="font-mono text-purple-300 font-bold">{inputs.cashFrictionThreshold.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min={-1.5}
              max={0.0}
              step={0.05}
              value={inputs.cashFrictionThreshold}
              onChange={(e) => onUpdateInputs({ cashFrictionThreshold: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
              <div className="bg-slate-900 p-2 rounded-lg">
                <div className="text-slate-400">ZIRP/NIRP 长期均衡锚 (r*+π_e)</div>
                <div className="text-purple-300 font-bold">{formatPct(output.policy.cmeZirpAnchorRate)}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg">
                <div className="text-slate-400">隐含利率与现金下限检验</div>
                <div className={output.policy.zlbBreachFeasible ? 'text-emerald-300 font-bold' : 'text-rose-400 font-bold'}>
                  {output.policy.zlbBreachFeasible ? '未触及囤积现钞临界点' : '警告：突破物理摩擦下限，触发挤兑囤钞'}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Core Considerations from Image 8 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-950/75 p-2.5 rounded-xl border border-slate-800">
              <div className="font-bold text-purple-300">1. 历史数据不可靠</div>
              <div className="text-slate-400 mt-0.5">极少历史周期包含负利率，且市场微结构已发生根本性变化。</div>
            </div>
            <div className="bg-slate-950/75 p-2.5 rounded-xl border border-slate-800">
              <div className="font-bold text-purple-300">2. 定量模型失效</div>
              <div className="text-slate-400 mt-0.5">正常环境下校准的统计关系在ZIRP/NIRP区间内往往直接断裂。</div>
            </div>
            <div className="bg-slate-950/75 p-2.5 rounded-xl border border-slate-800">
              <div className="font-bold text-purple-300">3. 预测须剔除历史均值</div>
              <div className="text-slate-400 mt-0.5">历史均值平滑了极端周期差异，长期预期需锚定 r_neutral 并加权收敛路径。</div>
            </div>
            <div className="bg-slate-950/75 p-2.5 rounded-xl border border-slate-800">
              <div className="font-bold text-purple-300">4. 政策叠加扭曲曲线</div>
              <div className="text-slate-400 mt-0.5">QE大量购买国债（流量效应明显、存量后易被套利）常导致资金流向回购分红而非CapEx。</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Image 9 - 2x2 Policy Mix, Yield Curve & Debt Politicization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 2x2 Policy Mix + Debt Politicization */}
        <div className="lg:col-span-5 glass-card p-4 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase">图9 · 2×2 政策组合与宏观风险</span>
              <h3 className="text-sm font-bold text-slate-100">财政 × 货币政策矩阵与债务通胀螺旋</h3>
            </div>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {policyMixCells.map((cell) => {
              const selected =
                inputs.fiscalStance === cell.fiscal && inputs.monetaryStance === cell.monetary;
              return (
                <button
                  key={cell.title}
                  onClick={() =>
                    onUpdateInputs({ fiscalStance: cell.fiscal, monetaryStance: cell.monetary })
                  }
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selected
                      ? 'bg-cyan-950/60 border-cyan-400/70 shadow-cyan-glow text-slate-100'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-100">{cell.title}</div>
                  <div className="text-[10px] font-mono text-cyan-300 mt-1">
                    {cell.real} + {cell.inf}
                  </div>
                  <div className="text-[11px] font-bold text-amber-300 mt-0.5">= {cell.nominal}</div>
                </button>
              );
            })}
          </div>

          {/* Debt Politicization Risk */}
          <div className="bg-slate-950/85 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-rose-200">央行政治化与“通胀化债”螺旋风险</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                  output.policy.debtSpiralRiskScore >= 65
                    ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                    : output.policy.debtSpiralRiskScore >= 38
                    ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                }`}
              >
                风险指数 {output.policy.debtSpiralRiskScore}/100
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">美国联邦政府债务 / GDP</span>
                <span className="font-mono text-rose-300 font-bold">{inputs.govDebtPctGdp.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={30}
                max={160}
                step={2}
                value={inputs.govDebtPctGdp}
                onChange={(e) => onUpdateInputs({ govDebtPctGdp: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">联邦财政赤字率 (G-T)/GDP</span>
                <span className="font-mono text-rose-300 font-bold">{inputs.fiscalDeficitPctGdp.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={-2}
                max={12}
                step={0.2}
                value={inputs.fiscalDeficitPctGdp}
                onChange={(e) => onUpdateInputs({ fiscalDeficitPctGdp: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              状态：<strong className="text-slate-200">{output.policy.debtSpiralRiskLabel}</strong>。当政府债务/GDP极高且赤字持续扩张时，央行面临“以通胀化债”政治胁迫，长端曲线被迫陡峭化：高通胀 → 高名义利率 → 利息债务加速积累 → 被迫更宽松货币。
            </p>
          </div>
        </div>

        {/* Yield Curve ECharts */}
        <div className="lg:col-span-7 glass-card p-4 rounded-2xl flex flex-col justify-between space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-mono text-cyan-400 uppercase flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                美国国债收益率曲线动态仿真 (3M – 30Y)
              </div>
              <h3 className="text-sm font-bold text-slate-100 mt-0.5">{output.policy.curveShapeLabel}</h3>
            </div>
            <div className="flex gap-2 font-mono text-xs">
              <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                10Y-2Y: {formatPct(output.policy.slope10Y2Y, 2, true)}
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                10Y-3M: {formatPct(output.policy.slope10Y3M, 2, true)}
              </span>
            </div>
          </div>

          <EChartWrapper option={yieldCurveOption} height="280px" />

          <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-[11px]">
            {output.policy.yieldCurve.map((pt) => (
              <div key={pt.tenor} className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">{pt.tenor}</div>
                <div className="text-cyan-300 font-bold">{pt.simulatedYield.toFixed(2)}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
