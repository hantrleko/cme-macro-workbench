import React from 'react';
import { MacroSimulationInputs } from '../types/macro';
import { X, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { formatPct } from '../utils/formatters';

interface QuickMacroSandboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  inputs: MacroSimulationInputs;
  onUpdateInputs: (patch: Partial<MacroSimulationInputs>) => void;
  onResetPreset: () => void;
  presetName: string;
}

interface SliderItemProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

const SliderItem: React.FC<SliderItemProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit = '%',
  onChange,
}) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[11px]">
      <span className="text-slate-300">{label}</span>
      <span className="font-mono font-bold text-cyan-300">
        {value.toFixed(step < 0.1 ? 2 : 1)}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
    />
  </div>
);

export const QuickMacroSandboxDrawer: React.FC<QuickMacroSandboxDrawerProps> = ({
  isOpen,
  onClose,
  inputs,
  onUpdateInputs,
  onResetPreset,
  presetName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-slideInRight">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100">实时宏观调参沙盘 (60fps)</h2>
              <p className="text-[11px] text-slate-400 truncate max-w-[260px]">当前基准: {presetName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onResetPreset}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
            >
              <RotateCcw className="w-3 h-3" />
              重置
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {/* Group 1: Taylor & Policy */}
          <section className="glass-card p-3.5 rounded-xl space-y-3">
            <h3 className="text-xs font-mono font-bold text-amber-300 uppercase">
              01 泰勒规则与政策立场 (图7 / 图9)
            </h3>
            <SliderItem
              label="中性实际利率 r_neutral"
              value={inputs.neutralRealRate}
              min={-0.5}
              max={3.5}
              step={0.05}
              onChange={(v) => onUpdateInputs({ neutralRealRate: v })}
            />
            <SliderItem
              label="预期通胀率 π_e"
              value={inputs.expectedInflation}
              min={-1.5}
              max={9.5}
              step={0.1}
              onChange={(v) => onUpdateInputs({ expectedInflation: v })}
            />
            <SliderItem
              label="产出缺口 (Y_e - Y_trend)"
              value={inputs.outputGap}
              min={-6.0}
              max={4.0}
              step={0.1}
              onChange={(v) => onUpdateInputs({ outputGap: v })}
            />
            <SliderItem
              label="实际联邦基金利率 Fed Funds"
              value={inputs.actualFedFundsRate}
              min={-0.75}
              max={10.0}
              step={0.25}
              onChange={(v) => onUpdateInputs({ actualFedFundsRate: v })}
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() =>
                  onUpdateInputs({ fiscalStance: inputs.fiscalStance === 'loose' ? 'tight' : 'loose' })
                }
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  inputs.fiscalStance === 'loose'
                    ? 'bg-rose-950/60 border-rose-700/60 text-rose-300'
                    : 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                }`}
              >
                财政: {inputs.fiscalStance === 'loose' ? '宽松 (Loose)' : '紧缩 (Tight)'}
              </button>
              <button
                onClick={() =>
                  onUpdateInputs({ monetaryStance: inputs.monetaryStance === 'loose' ? 'tight' : 'loose' })
                }
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  inputs.monetaryStance === 'loose'
                    ? 'bg-cyan-950/60 border-cyan-700/60 text-cyan-300'
                    : 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                }`}
              >
                货币: {inputs.monetaryStance === 'loose' ? '宽松 (Loose)' : '紧缩 (Tight)'}
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs.qeActive}
                  onChange={(e) => onUpdateInputs({ qeActive: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500"
                />
                <span>开启 QE</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={inputs.zirpNirpMode}
                  onChange={(e) => onUpdateInputs({ zirpNirpMode: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500"
                />
                <span>ZIRP / NIRP 零下限模式</span>
              </label>
            </div>
          </section>

          {/* Group 2: Growth & Equity Anchor */}
          <section className="glass-card p-3.5 rounded-xl space-y-3">
            <h3 className="text-xs font-mono font-bold text-emerald-300 uppercase">
              02 Solow增长与美股锚定 (图3 / 图11)
            </h3>
            <SliderItem
              label="全要素生产率 TFP 增速"
              value={inputs.tfpGrowth}
              min={0.0}
              max={3.0}
              step={0.05}
              onChange={(v) => onUpdateInputs({ tfpGrowth: v })}
            />
            <SliderItem
              label="资本深化 Capital Deepening"
              value={inputs.capitalDeepening}
              min={0.0}
              max={2.0}
              step={0.05}
              onChange={(v) => onUpdateInputs({ capitalDeepening: v })}
            />
            <SliderItem
              label="年化估值倍数变化 ΔPE"
              value={inputs.peReRatingAnnual}
              min={-4.0}
              max={3.0}
              step={0.1}
              onChange={(v) => onUpdateInputs({ peReRatingAnnual: v })}
            />
            <SliderItem
              label="外生冲击幅值 Shock Magnitude"
              value={inputs.shockMagnitude}
              min={0.0}
              max={10.0}
              step={0.5}
              onChange={(v) => onUpdateInputs({ shockMagnitude: v })}
            />
          </section>

          {/* Group 3: Data Biases & Twin Deficits */}
          <section className="glass-card p-3.5 rounded-xl space-y-3">
            <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase">
              03 偏差校准与双赤字平衡 (图1 / 图10)
            </h3>
            <SliderItem
              label="条件信息收缩权重 λ (Conditioning)"
              value={inputs.shrinkageLambda}
              min={0.0}
              max={1.0}
              step={0.05}
              unit=""
              onChange={(v) => onUpdateInputs({ shrinkageLambda: v })}
            />
            <SliderItem
              label="Geltner 去平滑系数 α (地产/私募)"
              value={inputs.appraisalSmoothingAlpha}
              min={0.2}
              max={1.0}
              step={0.05}
              unit=""
              onChange={(v) => onUpdateInputs({ appraisalSmoothingAlpha: v })}
            />
            <SliderItem
              label="财政赤字率 (G-T)/GDP"
              value={inputs.fiscalDeficitPctGdp}
              min={-2.0}
              max={12.0}
              step={0.2}
              onChange={(v) => onUpdateInputs({ fiscalDeficitPctGdp: v })}
            />
            <SliderItem
              label="联邦政府债务/GDP"
              value={inputs.govDebtPctGdp}
              min={30}
              max={160}
              step={2}
              onChange={(v) => onUpdateInputs({ govDebtPctGdp: v })}
            />
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              所有调整实时同步至底部 6 个分析阶段与顶部遥测 HUD（当前预测视野：
              <span className="font-mono text-cyan-300 ml-1">{inputs.horizonYears}Y</span>，预期通胀{' '}
              <span className="font-mono text-amber-300">{formatPct(inputs.expectedInflation)}</span>）。
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
