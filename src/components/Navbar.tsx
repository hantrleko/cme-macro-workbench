import React from 'react';
import { MacroRegimePreset } from '../types/macro';
import { US_MACRO_PRESETS } from '../data/usMacroPresets';
import {
  Activity,
  Command,
  Database,
  FileSpreadsheet,
  SlidersHorizontal,
  Radio,
  RotateCcw,
} from 'lucide-react';

interface NavbarProps {
  activePreset: MacroRegimePreset;
  onSelectPreset: (preset: MacroRegimePreset) => void;
  isModified: boolean;
  onResetPreset: () => void;
  horizonYears: 1 | 5 | 10;
  onChangeHorizon: (h: 1 | 5 | 10) => void;
  dataMode: 'simulation' | 'fred-live';
  onChangeDataMode: (mode: 'simulation' | 'fred-live') => void;
  fredLatestQuarter?: string | null;
  onOpenSevenStepModal: () => void;
  onOpenFredBridge: () => void;
  onToggleSandbox: () => void;
  onOpenCommandPalette: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePreset,
  onSelectPreset,
  isModified,
  onResetPreset,
  horizonYears,
  onChangeHorizon,
  dataMode,
  onChangeDataMode,
  fredLatestQuarter,
  onOpenSevenStepModal,
  onOpenFredBridge,
  onToggleSandbox,
  onOpenCommandPalette,
}) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800/80 text-slate-100 sticky top-0 z-40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col xl:flex-row items-center justify-between gap-2.5">
        {/* Brand */}
        <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-900/30 flex-shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase">
                  Eugene Finance ｜ CFA III 宏观预期实验室
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 font-mono font-bold flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" /> v2.0 FRED + MVO
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-slate-100">
                美国宏观周期与资本市场预期工作台 (CME Workbench)
              </h1>
            </div>
          </div>

          {/* Data Mode Toggle: Simulation vs Real-World FRED */}
          <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onChangeDataMode('simulation')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
                dataMode === 'simulation'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              仿真推演
            </button>
            <button
              onClick={() => onChangeDataMode('fred-live')}
              title={fredLatestQuarter ? `已载入 FRED 1971–${fredLatestQuarter} 真实美债与宏观数据` : '载入 FRED 真实数据'}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                dataMode === 'fred-live'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>真实FRED</span>
            </button>
          </div>

          {/* Horizon switcher on mobile/compact */}
          <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
            {([1, 5, 10] as const).map((h) => (
              <button
                key={h}
                onClick={() => onChangeHorizon(h)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                  horizonYears === h
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {h}Y
              </button>
            ))}
          </div>
        </div>

        {/* Preset Regime Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full scrollbar-none">
          {US_MACRO_PRESETS.map((preset) => {
            const isSelected = preset.id === activePreset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                title={preset.summary}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-slate-800 text-cyan-300 font-bold shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <span className="font-mono text-[10px] opacity-80">{preset.code}</span>
                <span>{preset.name.split(' ')[1] || preset.name}</span>
              </button>
            );
          })}
          {isModified && (
            <button
              onClick={onResetPreset}
              title="恢复到当前情景预设参数"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono bg-amber-950/70 text-amber-300 border border-amber-700/50 hover:bg-amber-900/70 transition-all whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>已微调 · 重置</span>
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-all"
            title="快速跳转情景、阶段与知识点 (Ctrl+K)"
          >
            <Command className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-mono text-[11px]">Ctrl+K</span>
          </button>

          <button
            onClick={onOpenFredBridge}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-xs text-indigo-300 transition-all"
            title="查看美国 FRED / BEA / Treasury 实证接口映射"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">FRED实证桥接</span>
          </button>

          <button
            onClick={onOpenSevenStepModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-700/50 hover:bg-emerald-900/70 text-xs text-emerald-300 font-semibold transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>7步CME报告 & 反馈</span>
          </button>

          <button
            onClick={onToggleSandbox}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white font-semibold shadow-sm shadow-cyan-900/40 transition-all"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>宏观调参沙盘</span>
          </button>
        </div>
      </div>
    </header>
  );
};
