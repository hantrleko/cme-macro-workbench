import React from 'react';
import { ShieldAlert, TrendingUp, Compass, Scale, Globe2, Layers, PieChart } from 'lucide-react';

export type MacroStageId =
  | 'data-bias'
  | 'growth-shocks'
  | 'cycle-forecasting'
  | 'policy-curve'
  | 'international'
  | 'cme-synthesis'
  | 'portfolio-optimizer';

interface StageDef {
  id: MacroStageId;
  step: string;
  title: string;
  figureRef: string;
  icon: React.FC<{ className?: string }>;
}

export const WORKBENCH_STAGES: StageDef[] = [
  {
    id: 'data-bias',
    step: '01',
    title: '数据陷阱与偏差审计',
    figureRef: '图1 · 数据/历史/方法偏差',
    icon: ShieldAlert,
  },
  {
    id: 'growth-shocks',
    step: '02',
    title: '增长拆解与外生冲击',
    figureRef: '图3 · 图11 · GDP与GFC路径',
    icon: TrendingUp,
  },
  {
    id: 'cycle-forecasting',
    step: '03',
    title: '预测方法与周期五阶段',
    figureRef: '图4 · 图5 · 图6 · 通胀矩阵',
    icon: Compass,
  },
  {
    id: 'policy-curve',
    step: '04',
    title: '泰勒规则与政策曲线',
    figureRef: '图7 · 图8 · 图9 · ZIRP/QE',
    icon: Scale,
  },
  {
    id: 'international',
    step: '05',
    title: '国际联动与双赤字超调',
    figureRef: '图10 · 不可能三角与PPP',
    icon: Globe2,
  },
  {
    id: 'cme-synthesis',
    step: '06',
    title: '7步法CME跨资产矩阵',
    figureRef: '图2 · Part 2 精细定价',
    icon: Layers,
  },
  {
    id: 'portfolio-optimizer',
    step: '07',
    title: '组合优化与蒙特卡洛',
    figureRef: 'MVO · Risk Parity · CVaR',
    icon: PieChart,
  },
];

interface StageNavigatorProps {
  currentStage: MacroStageId;
  onSelectStage: (stage: MacroStageId) => void;
}

export const StageNavigator: React.FC<StageNavigatorProps> = ({
  currentStage,
  onSelectStage,
}) => {
  return (
    <div className="bg-slate-950/80 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {WORKBENCH_STAGES.map((stage) => {
            const Icon = stage.icon;
            const active = currentStage === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => onSelectStage(stage.id)}
                className={`text-left px-3 py-2 rounded-xl border transition-all flex items-start gap-2.5 ${
                  active
                    ? 'bg-cyan-950/50 border-cyan-500/60 shadow-cyan-glow text-slate-100'
                    : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    active ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        active ? 'text-cyan-400' : 'text-slate-500'
                      }`}
                    >
                      {stage.step}
                    </span>
                    <span className="text-xs font-bold truncate">{stage.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{stage.figureRef}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
