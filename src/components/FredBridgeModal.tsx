import React from 'react';
import { FRED_SERIES_MAPPING } from '../data/fredMapping';
import { X, Database, ShieldCheck } from 'lucide-react';

interface FredBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FredBridgeModal: React.FC<FredBridgeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-5xl max-h-[88vh] rounded-2xl flex flex-col overflow-hidden animate-fadeIn">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100">
                美国真实宏观数据接口架构 (Phase 2 FRED / ALFRED 实证桥接清单)
              </h2>
              <p className="text-xs text-slate-400">
                当前工作台处于纯仿真验证模式；所有模型变量均已预留与 St. Louis Fed FRED / ALFRED 的一对一接口契约。
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-700/40 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-indigo-200">为什么采用 ALFRED Point-in-Time (PIT) 架构？</strong>
              图1与图4指出，BEA 的 GDP、PCE 等宏观数据存在显著的“发布滞后”与“事后多轮修订”。下一阶段接入真实 API 时，系统将同时拉取 <code className="text-cyan-300">FRED</code> 最新修订序列与 <code className="text-cyan-300">ALFRED</code> 历史发布日初值，以量化实盘回测的 Look-ahead Bias。
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="py-2 px-3">FRED 序列代码</th>
                  <th className="py-2 px-3">美国宏观指标</th>
                  <th className="py-2 px-3">机构 / 频率</th>
                  <th className="py-2 px-3">发布滞后与修订风险</th>
                  <th className="py-2 px-3">映射沙盘变量</th>
                  <th className="py-2 px-3">CME 方法论防坑注释</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {FRED_SERIES_MAPPING.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/60">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-300 whitespace-nowrap">
                      {item.fredCode}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-100">{item.chineseName}</div>
                      <div className="text-[10px] text-slate-500">{item.title}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="text-slate-200">{item.sourceAgency}</div>
                      <div className="text-[10px] font-mono text-slate-400">{item.frequency}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-300">{item.publicationLag}</div>
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] font-mono ${
                          item.revisionRisk.startsWith('High')
                            ? 'bg-rose-950/70 text-rose-300 border border-rose-700/40'
                            : 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/40'
                        }`}
                      >
                        {item.revisionRisk}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-amber-300">
                      {item.workbenchVariable}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-xs leading-relaxed">
                      {item.cmePitfallNote}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
