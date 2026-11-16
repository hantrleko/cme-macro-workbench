import React, { useMemo } from 'react';
import { FxRegimeId, MacroEngineOutput, MacroSimulationInputs } from '../../types/macro';
import { EChartWrapper } from '../EChartWrapper';
import { formatPct } from '../../utils/formatters';
import { Globe2, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface InternationalLinkagesStageProps {
  inputs: MacroSimulationInputs;
  output: MacroEngineOutput;
  onUpdateInputs: (patch: Partial<MacroSimulationInputs>) => void;
}

export const InternationalLinkagesStage: React.FC<InternationalLinkagesStageProps> = ({
  inputs,
  output,
  onUpdateInputs,
}) => {
  // Chart 1: National Income Identity Stacked Balance
  const identityChartOption = useMemo<EChartsOption>(() => {
    const intl = output.international;
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
      grid: { left: 48, right: 20, top: 24, bottom: 28 },
      xAxis: {
        type: 'category',
        data: ['私人净储蓄 (S-I)', '政府财政平衡 (T-G)', '经常账户 (X-M)', '资本账户镜像 (KA)'],
        axisLabel: { color: '#cbd5e1', fontSize: 10 },
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
          barWidth: '42%',
          data: [
            { value: intl.netPrivateSavingPctGdp, itemStyle: { color: '#34d399' } },
            { value: intl.fiscalBalancePctGdp, itemStyle: { color: intl.fiscalBalancePctGdp >= 0 ? '#38bdf8' : '#f43f5e' } },
            { value: intl.currentAccountPctGdp, itemStyle: { color: intl.currentAccountPctGdp >= 0 ? '#22d3ee' : '#fb923c' } },
            { value: intl.capitalAccountPctGdp, itemStyle: { color: '#a78bfa' } },
          ],
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
  }, [output.international]);

  // Chart 2: Dornbusch FX Overshooting 20Q Trajectory
  const fxChartOption = useMemo<EChartsOption>(() => {
    const path = output.international.fxOvershootPath;
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
      legend: { data: ['美元即期汇率指数 (Spot USD)', '购买力平价长期均衡 (PPP=100)'], textStyle: { color: '#94a3b8', fontSize: 10 }, top: 0 },
      grid: { left: 45, right: 20, top: 32, bottom: 26 },
      xAxis: {
        type: 'category',
        data: path.map((p) => p.label),
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
          name: '美元即期汇率指数 (Spot USD)',
          type: 'line',
          smooth: true,
          data: path.map((p) => p.spotIndex),
          lineStyle: { color: '#22d3ee', width: 3 },
          itemStyle: { color: '#22d3ee' },
        },
        {
          name: '购买力平价长期均衡 (PPP=100)',
          type: 'line',
          data: path.map((p) => p.pppEquilibrium),
          lineStyle: { color: '#94a3b8', type: 'dashed', width: 1.5 },
          symbol: 'none',
        },
      ],
    };
  }, [output.international.fxOvershootPath]);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Row 1: Column 1 (National Income Identity) + Column 3 (PPP & Global Saving=Investment) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 glass-card p-4 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] font-mono text-indigo-400 uppercase">
                图10 · Column A 国际收支镜像与国民收入恒等式
              </span>
              <h3 className="text-sm font-bold text-slate-100">
                (X − M) = (S − I) + (T − G) 美国双赤字沙盒
              </h3>
            </div>
            <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 font-mono text-xs space-y-1">
            <div className="text-slate-400 text-[11px]">国民收入与“镜子镜像”会计恒等式（占GDP百分比）</div>
            <div className="text-cyan-300 font-bold">
              (X−M) {formatPct(output.international.currentAccountPctGdp, 2, true)} = (S−I){' '}
              {formatPct(output.international.netPrivateSavingPctGdp, 2, true)} + (T−G){' '}
              {formatPct(output.international.fiscalBalancePctGdp, 2, true)}
              <span className="text-indigo-300 ml-2">
                ↔ 资本账户 = {formatPct(output.international.capitalAccountPctGdp, 2, true)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">私人总储蓄 S/GDP</span>
                <span className="font-mono text-emerald-300 font-bold">{inputs.privateSavingPctGdp.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={28}
                step={0.2}
                value={inputs.privateSavingPctGdp}
                onChange={(e) => onUpdateInputs({ privateSavingPctGdp: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">私人总投资 I/GDP</span>
                <span className="font-mono text-cyan-300 font-bold">{inputs.privateInvestmentPctGdp.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={25}
                step={0.2}
                value={inputs.privateInvestmentPctGdp}
                onChange={(e) => onUpdateInputs({ privateInvestmentPctGdp: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">财政赤字 (G-T)/GDP</span>
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
          </div>

          <EChartWrapper option={identityChartOption} height="215px" />

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-950/75 p-2.5 rounded-xl border border-slate-800">
              <strong className="text-cyan-300">短期调整机制：</strong>
              <span className="text-slate-400">金融市场调整极快，短期通过利率、汇率与资产价格变动来维持资本账户平衡。</span>
            </div>
            <div className="bg-slate-950/75 p-2.5 rounded-xl border border-slate-800">
              <strong className="text-emerald-300">长期调整机制：</strong>
              <span className="text-slate-400">实体经济与经常账户演变缓慢，长期反映储蓄率、人口趋势与相对竞争力。</span>
            </div>
          </div>
        </div>

        {/* Column B & C: Impossible Trinity, Grexit Curve Inversion, Dornbusch Overshooting & PPP */}
        <div className="lg:col-span-6 glass-card p-4 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase">
                图10 · Column B & C 汇率超调 · 不可能三角 · PPP 失效
              </span>
              <h3 className="text-sm font-bold text-slate-100">
                跨国实际利差与美元 Dornbusch Overshooting 路径仿真
              </h3>
            </div>
            <Globe2 className="w-4 h-4 text-cyan-400" />
          </div>

          {/* FX Regime Selector (Impossible Trinity) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-slate-400 uppercase">
              不可能三角 (资本自由流动 / 固定汇率 / 独立货币政策 不可兼得)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'floating', label: '浮动汇率 (美国现状: 独立货币+资本自由)' },
                  { id: 'credibly-fixed', label: '永久可信固定 (共享无风险曲线)' },
                  { id: 'pegged-fragile', label: '脆弱盯住 (Grexit 贬值曲线倒挂)' },
                ] as Array<{ id: FxRegimeId; label: string }>
              ).map((r) => (
                <button
                  key={r.id}
                  onClick={() => onUpdateInputs({ fxRegime: r.id })}
                  className={`p-2 rounded-xl border text-[11px] font-semibold transition-all text-left ${
                    inputs.fxRegime === r.id
                      ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-200'
                      : 'bg-slate-950/75 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">海外主要经济体实际收益率</span>
                <span className="font-mono text-indigo-300 font-bold">{inputs.foreignRealYield.toFixed(2)}%</span>
              </div>
              <input
                type="range"
                min={-1.5}
                max={3.5}
                step={0.1}
                value={inputs.foreignRealYield}
                onChange={(e) => onUpdateInputs({ foreignRealYield: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">美元相对PPP初始偏离度</span>
                <span className="font-mono text-amber-300 font-bold">{inputs.pppDeviationInitial.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={-20}
                max={25}
                step={1}
                value={inputs.pppDeviationInitial}
                onChange={(e) => onUpdateInputs({ pppDeviationInitial: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">美国10Y实际利率</div>
              <div className="text-cyan-300 font-bold">{formatPct(output.international.usRealYield10Y)}</div>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">美外10Y实际利差</div>
              <div className="text-amber-300 font-bold">
                {formatPct(output.international.realYieldSpreadVsForeign, 2, true)}
              </div>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">即期超调幅度</div>
              <div className="text-indigo-300 font-bold">
                {formatPct(output.international.fxOvershootInitialPct, 2, true)}
              </div>
            </div>
          </div>

          <EChartWrapper option={fxChartOption} height="200px" />

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-[11px]">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <span className="text-slate-300">{output.international.grexitStyleInversionRisk}</span>
            </div>
            <div className="text-slate-400">
              <strong className="text-emerald-300">PPP 在投资期限内失效 & 全球储蓄共振：</strong>
              经验表明购买力平价在常见投资周期内并不成立，跨国实际利率差异无法轻易套利消除；同时由于「全球储蓄 = 全球投资」，各国实际利率往往同向共振（如2008后全球高储蓄低投资共同压低实际利率）。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
