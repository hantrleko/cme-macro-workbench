import React, { useState, useMemo, useEffect } from 'react';
import { FredLiveDataset, MacroRegimePreset, MacroSimulationInputs } from './types/macro';
import { US_MACRO_PRESETS } from './data/usMacroPresets';
import { runFullMacroCmeSimulation } from './utils/macroCmeEngine';
import { FRED_ERA_BOOKMARKS, loadFredLiveDataset, mapFredRecordToInputs } from './utils/fredDataService';
import { Navbar } from './components/Navbar';
import { MacroTelemetryHud } from './components/MacroTelemetryHud';
import { StageNavigator, MacroStageId } from './components/StageNavigator';
import { QuickMacroSandboxDrawer } from './components/QuickMacroSandboxDrawer';
import { CmeSevenStepModal } from './components/CmeSevenStepModal';
import { FredBridgeModal } from './components/FredBridgeModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { DataBiasAuditStage } from './components/stages/DataBiasAuditStage';
import { GrowthAndShocksStage } from './components/stages/GrowthAndShocksStage';
import { CycleAndForecastingStage } from './components/stages/CycleAndForecastingStage';
import { PolicyAndYieldCurveStage } from './components/stages/PolicyAndYieldCurveStage';
import { InternationalLinkagesStage } from './components/stages/InternationalLinkagesStage';
import { CmeSynthesisStage } from './components/stages/CmeSynthesisStage';
import { PortfolioOptimizerStage } from './components/stages/PortfolioOptimizerStage';
import { Info, History } from 'lucide-react';

export const App: React.FC = () => {
  const [activePreset, setActivePreset] = useState<MacroRegimePreset>(US_MACRO_PRESETS[0]);
  const [inputs, setInputs] = useState<MacroSimulationInputs>(US_MACRO_PRESETS[0].inputs);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<MacroStageId>('data-bias');

  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(false);
  const [isSevenStepOpen, setIsSevenStepOpen] = useState<boolean>(false);
  const [isFredBridgeOpen, setIsFredBridgeOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // v2.0 Real-World FRED Data & Historical Time-Machine
  const [dataMode, setDataMode] = useState<'simulation' | 'fred-live'>('simulation');
  const [fredDataset, setFredDataset] = useState<FredLiveDataset | null>(null);
  const [fredQuarterIdx, setFredQuarterIdx] = useState<number>(0);

  useEffect(() => {
    loadFredLiveDataset().then((ds) => {
      if (ds && ds.records.length > 0) {
        setFredDataset(ds);
        setFredQuarterIdx(ds.records.length - 1);
      }
    });
  }, []);

  const activeFredRecord = useMemo(() => {
    if (dataMode !== 'fred-live' || !fredDataset || !fredDataset.records.length) return null;
    return fredDataset.records[Math.min(fredQuarterIdx, fredDataset.records.length - 1)];
  }, [dataMode, fredDataset, fredQuarterIdx]);

  const handleChangeDataMode = (mode: 'simulation' | 'fred-live') => {
    setDataMode(mode);
    if (mode === 'fred-live' && fredDataset && fredDataset.records.length > 0) {
      const idx = Math.min(fredQuarterIdx, fredDataset.records.length - 1);
      setInputs(mapFredRecordToInputs(fredDataset.records[idx], activePreset.inputs));
      setIsModified(false);
    } else {
      setInputs(activePreset.inputs);
      setIsModified(false);
    }
  };

  const handleSelectFredQuarterIndex = (idx: number) => {
    if (!fredDataset || !fredDataset.records[idx]) return;
    setFredQuarterIdx(idx);
    setInputs(mapFredRecordToInputs(fredDataset.records[idx], activePreset.inputs));
    setIsModified(false);
  };

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectPreset = (preset: MacroRegimePreset) => {
    setActivePreset(preset);
    setInputs(preset.inputs);
    setIsModified(false);
  };

  const handleResetPreset = () => {
    setInputs(activePreset.inputs);
    setIsModified(false);
  };

  const handleUpdateInputs = (patch: Partial<MacroSimulationInputs>) => {
    setInputs((prev) => ({ ...prev, ...patch }));
    setIsModified(true);
  };

  const engineOutput = useMemo(() => runFullMacroCmeSimulation(inputs), [inputs]);

  return (
    <div className="min-h-screen bg-slate-950 bg-grid-pattern text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        activePreset={activePreset}
        onSelectPreset={(p) => {
          setDataMode('simulation');
          handleSelectPreset(p);
        }}
        isModified={isModified}
        onResetPreset={handleResetPreset}
        horizonYears={inputs.horizonYears}
        onChangeHorizon={(h) => handleUpdateInputs({ horizonYears: h })}
        dataMode={dataMode}
        onChangeDataMode={handleChangeDataMode}
        fredLatestQuarter={fredDataset?.latestQuarter}
        onOpenSevenStepModal={() => setIsSevenStepOpen(true)}
        onOpenFredBridge={() => setIsFredBridgeOpen(true)}
        onToggleSandbox={() => setIsSandboxOpen((prev) => !prev)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* Sticky Live Telemetry HUD */}
      <MacroTelemetryHud inputs={inputs} output={engineOutput} />

      {/* 6-Stage Horizontal Workflow Navigator */}
      <StageNavigator currentStage={currentStage} onSelectStage={setCurrentStage} />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 space-y-5">
        {/* FRED Historical Time-Machine Bar when in Real-World Mode */}
        {dataMode === 'fred-live' && fredDataset && activeFredRecord && (
          <div className="glass-panel px-4 py-3 rounded-2xl border border-emerald-700/50 bg-emerald-950/20 space-y-2.5 text-xs animate-fadeIn">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-emerald-200">
                  FRED 真实历史时空机 ({fredDataset.records[0].quarter} – {fredDataset.latestQuarter})
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-900/70 text-emerald-200 font-mono text-[11px] font-bold">
                  当前快照: {activeFredRecord.quarter}
                </span>
                <span className="text-[11px] font-mono text-slate-300">
                  FedFunds {activeFredRecord.fedFunds}% · Core PCE {activeFredRecord.corePceYoy}% · 10Y {activeFredRecord.curve['10Y']}% · IG OAS {activeFredRecord.igOas}% · HY OAS {activeFredRecord.hyOas}%
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {FRED_ERA_BOOKMARKS.map((bm) => {
                  const targetIdx = fredDataset.records.findIndex((r) => r.quarter === bm.quarter);
                  if (targetIdx < 0) return null;
                  return (
                    <button
                      key={bm.quarter}
                      onClick={() => handleSelectFredQuarterIndex(targetIdx)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all ${
                        fredQuarterIdx === targetIdx
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-emerald-500/60'
                      }`}
                    >
                      {bm.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => handleSelectFredQuarterIndex(fredDataset.records.length - 1)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                    fredQuarterIdx === fredDataset.records.length - 1
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                      : 'bg-slate-900/80 border-slate-700 text-cyan-300'
                  }`}
                >
                  最新 ({fredDataset.latestQuarter})
                </button>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={fredDataset.records.length - 1}
              step={1}
              value={fredQuarterIdx}
              onChange={(e) => handleSelectFredQuarterIndex(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}

        {/* Preset Context Banner */}
        <div className="glass-card px-4 py-3 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-mono text-cyan-300 font-bold mr-2">{activePreset.code}</span>
              <span className="font-bold text-slate-100 mr-2">{activePreset.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300">
                {activePreset.eraTag}
              </span>
              <p className="text-slate-400 mt-1">{activePreset.summary}</p>
            </div>
          </div>
          <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-[11px] text-amber-200/90 max-w-md flex-shrink-0">
            <strong className="text-amber-300">核心教学/实战锚点：</strong>
            {activePreset.keyLesson}
          </div>
        </div>

        {/* Active Stage */}
        {currentStage === 'data-bias' && (
          <DataBiasAuditStage
            inputs={inputs}
            output={engineOutput}
            onUpdateInputs={handleUpdateInputs}
          />
        )}
        {currentStage === 'growth-shocks' && (
          <GrowthAndShocksStage
            inputs={inputs}
            output={engineOutput}
            onUpdateInputs={handleUpdateInputs}
          />
        )}
        {currentStage === 'cycle-forecasting' && (
          <CycleAndForecastingStage
            inputs={inputs}
            output={engineOutput}
            onUpdateInputs={handleUpdateInputs}
          />
        )}
        {currentStage === 'policy-curve' && (
          <PolicyAndYieldCurveStage
            inputs={inputs}
            output={engineOutput}
            onUpdateInputs={handleUpdateInputs}
            activeFredRecord={activeFredRecord}
          />
        )}
        {currentStage === 'international' && (
          <InternationalLinkagesStage
            inputs={inputs}
            output={engineOutput}
            onUpdateInputs={handleUpdateInputs}
          />
        )}
        {currentStage === 'cme-synthesis' && (
          <CmeSynthesisStage
            inputs={inputs}
            output={engineOutput}
            onUpdateInputs={handleUpdateInputs}
            onOpenSevenStepModal={() => setIsSevenStepOpen(true)}
          />
        )}
        {currentStage === 'portfolio-optimizer' && (
          <PortfolioOptimizerStage
            inputs={inputs}
            output={engineOutput}
            onUpdateInputs={handleUpdateInputs}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-3 px-4 text-center text-[11px] text-slate-500">
        美国宏观周期与资本市场预期工作台 (CME Workbench v2.0) · 100% 映射 CFA Level III CME Part 1 & Part 2 · 已集成 FRED 1971–2026 真实历史时空机与 MVO / Risk Parity 组合优化器
      </footer>

      {/* Drawers & Modals */}
      <QuickMacroSandboxDrawer
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
        inputs={inputs}
        onUpdateInputs={handleUpdateInputs}
        onResetPreset={handleResetPreset}
        presetName={activePreset.name}
      />

      <CmeSevenStepModal
        isOpen={isSevenStepOpen}
        onClose={() => setIsSevenStepOpen(false)}
        preset={activePreset}
        inputs={inputs}
        output={engineOutput}
      />

      <FredBridgeModal
        isOpen={isFredBridgeOpen}
        onClose={() => setIsFredBridgeOpen(false)}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectPreset={handleSelectPreset}
        onSelectStage={setCurrentStage}
      />
    </div>
  );
};
