import React, { useState, useMemo, useEffect } from 'react';
import { MacroRegimePreset, MacroSimulationInputs } from './types/macro';
import { US_MACRO_PRESETS } from './data/usMacroPresets';
import { runFullMacroCmeSimulation } from './utils/macroCmeEngine';
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
import { Info } from 'lucide-react';

export const App: React.FC = () => {
  const [activePreset, setActivePreset] = useState<MacroRegimePreset>(US_MACRO_PRESETS[0]);
  const [inputs, setInputs] = useState<MacroSimulationInputs>(US_MACRO_PRESETS[0].inputs);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<MacroStageId>('data-bias');

  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(false);
  const [isSevenStepOpen, setIsSevenStepOpen] = useState<boolean>(false);
  const [isFredBridgeOpen, setIsFredBridgeOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

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
        onSelectPreset={handleSelectPreset}
        isModified={isModified}
        onResetPreset={handleResetPreset}
        horizonYears={inputs.horizonYears}
        onChangeHorizon={(h) => handleUpdateInputs({ horizonYears: h })}
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
            onOpenSevenStepModal={() => setIsSevenStepOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-3 px-4 text-center text-[11px] text-slate-500">
        美国宏观周期与资本市场预期工作台 (CME Workbench) · 100% 映射 CFA Level III 资本市场预期 11 张核心框架图谱 · 阶段一纯仿真沙盘（已预留 FRED / ALFRED 实证桥接接口）
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
