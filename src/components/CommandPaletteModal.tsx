import React, { useState, useMemo } from 'react';
import { MacroRegimePreset } from '../types/macro';
import { US_MACRO_PRESETS } from '../data/usMacroPresets';
import { WORKBENCH_STAGES, MacroStageId } from './StageNavigator';
import { Search, X, ArrowRight } from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: MacroRegimePreset) => void;
  onSelectStage: (stage: MacroStageId) => void;
}

const CONCEPT_JUMP_CARDS: Array<{ title: string; figure: string; stage: MacroStageId }> = [
  { title: 'Time Lags / Vintage PIT vs 修订偏差 / Geltner去平滑', figure: '图1', stage: 'data-bias' },
  { title: '体制变革 (Regime Change) / 异步数据 / 比索问题 (Peso Problem)', figure: '图1', stage: 'data-bias' },
  { title: 'Solow GDP拆解 / 股票长期锚定 V_e = GDP × S_k × PE', figure: '图3', stage: 'growth-shocks' },
  { title: '为什么高经济增长 ≠ 高股票回报', figure: '图3', stage: 'growth-shocks' },
  { title: '外生冲击6大来源 & GFC后三种增长路径 (Type 1 / 2 / 3)', figure: '图11', stage: 'growth-shocks' },
  { title: '计量经济 vs LEI即时预测 vs 清单法 三合一PK', figure: '图4', stage: 'cycle-forecasting' },
  { title: '商业周期5阶段与大类资产表现', figure: '图5', stage: 'cycle-forecasting' },
  { title: '通胀与通缩 × 现金/名义债/股票/房地产 情景矩阵', figure: '图6', stage: 'cycle-forecasting' },
  { title: '泰勒规则 i* 公式 / 推拉绳子效应 / 自动稳定器', figure: '图7', stage: 'policy-curve' },
  { title: 'ZIRP / NIRP 零下限突破 / QE 扭曲与 CME 4大考虑因素', figure: '图8', stage: 'policy-curve' },
  { title: '2×2 货币财政组合矩阵 / LDI特例 / 债务通胀螺旋', figure: '图9', stage: 'policy-curve' },
  { title: '国民收入恒等式 (X-M)=(S-I)+(T-G) / 不可能三角 / 汇率超调', figure: '图10', stage: 'international' },
  { title: '7步法CME跨资产收益表与相关系数矩阵', figure: '图2', stage: 'cme-synthesis' },
];

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  onSelectStage,
}) => {
  const [query, setQuery] = useState('');

  const filteredPresets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return US_MACRO_PRESETS;
    return US_MACRO_PRESETS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.englishName.toLowerCase().includes(q) ||
        p.eraTag.toLowerCase().includes(q)
    );
  }, [query]);

  const filteredConcepts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CONCEPT_JUMP_CARDS;
    return CONCEPT_JUMP_CARDS.filter(
      (c) => c.title.toLowerCase().includes(q) || c.figure.toLowerCase().includes(q)
    );
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden animate-fadeIn">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-cyan-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索美国宏观情景 (2026/2022/2009/1974)、泰勒规则、比索问题、双赤字..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
          {filteredPresets.length > 0 && (
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase px-2 mb-1.5">
                一键切换美国宏观情景预设
              </div>
              <div className="space-y-1">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800/80 flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-100">
                        <span className="font-mono text-cyan-400 mr-2">{preset.code}</span>
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{preset.eraTag}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredConcepts.length > 0 && (
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase px-2 mb-1.5">
                直达 11 张核心图谱知识模块
              </div>
              <div className="space-y-1">
                {filteredConcepts.map((c, idx) => {
                  const stageName = WORKBENCH_STAGES.find((s) => s.id === c.stage)?.title;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        onSelectStage(c.stage);
                        onClose();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800/80 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/40 font-mono text-[10px]">
                          {c.figure}
                        </span>
                        <span className="text-xs text-slate-200">{c.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{stageName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
