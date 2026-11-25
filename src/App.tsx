import React, { useState } from 'react';
import { FileStack, Image, Layers, Lock, Stamp } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MergeSplitTool } from './components/tools/MergeSplitTool';
import { ImagePdfTool } from './components/tools/ImagePdfTool';
import { OrganizerTool } from './components/tools/OrganizerTool';
import { WatermarkTool } from './components/tools/WatermarkTool';
import { LockUnlockTool } from './components/tools/LockUnlockTool';
import { useOnlineStatus } from './hooks/usePWAInstall';

// Feature flag reserved for future 2028 Pro upgrades
export const ENABLE_PRO_LOCK = false;

type ToolId = 'merge-split' | 'image-pdf' | 'organizer' | 'watermark' | 'lock-unlock';

interface ToolTab {
  id: ToolId;
  label: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TOOLS: ToolTab[] = [
  { id: 'merge-split', label: 'Merge & Split', title: 'PDF Merge & Split', icon: FileStack },
  { id: 'image-pdf', label: 'Image & JPG', title: 'Image to PDF & PDF to JPG', icon: Image },
  { id: 'organizer', label: 'Page Organizer', title: 'PDF Page Organizer', icon: Layers },
  { id: 'watermark', label: 'Watermark & #', title: 'PDF Watermark & Page Numbers', icon: Stamp },
  { id: 'lock-unlock', label: 'Lock & Unlock', title: 'PDF Password Lock & Unlock', icon: Lock },
];

const STEPS = [
  { num: 1 as const, label: '1. Select File' },
  { num: 2 as const, label: '2. Click Action' },
  { num: 3 as const, label: '3. Download' },
];

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>('merge-split');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const isOnline = useOnlineStatus();

  const handleSelectTool = (toolId: ToolId) => {
    setActiveTool(toolId);
    setCurrentStep(1);
  };

  const activeMeta = TOOLS.find((t) => t.id === activeTool) || TOOLS[0];

  return (
    <div
      id="top"
      className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A] dark:bg-[#0B1120] dark:text-[#F8FAFC]"
    >
      <Header />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {/* Clean 3-Step Workflow Guide */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl dark:text-white text-balance">
              Simple, private PDF tools
            </h1>
            <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
              Everything runs inside your browser — zero uploads, zero waiting.
            </p>
          </div>

          <ol
            aria-label="How it works"
            className="flex flex-wrap items-center gap-2 text-sm font-semibold tabular-nums"
          >
            {STEPS.map((step, index) => {
              const isActive = currentStep === step.num;
              const isDone = currentStep > step.num;
              return (
                <React.Fragment key={step.num}>
                  <li
                    className={`rounded-lg px-2.5 py-1 transition-colors ${
                      isActive
                        ? 'bg-[#E11D48] text-white'
                        : isDone
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-[#FFFFFF] text-slate-500 border border-[#E2E8F0] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {step.label}
                  </li>
                  {index < STEPS.length - 1 && (
                    <span className="text-slate-400" aria-hidden="true">
                      →
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </ol>
        </div>

        {/* 5 Tool Selector Tabs */}
        <nav
          aria-label="PDF Tools"
          className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
        >
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const selected = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleSelectTool(tool.id)}
                aria-current={selected ? 'page' : undefined}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E11D48] ${
                  selected
                    ? 'border-[#E11D48] bg-[#E11D48] text-white shadow-sm'
                    : 'border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A] hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{tool.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Tool Card */}
        <section
          aria-label={activeMeta.title}
          className="rounded-3xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="mb-2 text-xl font-bold text-[#0F172A] sm:text-2xl dark:text-white">
            {activeMeta.title}
          </h2>

          <ErrorBoundary key={activeTool}>
            {activeTool === 'merge-split' && (
              <MergeSplitTool onStepChange={setCurrentStep} />
            )}
            {activeTool === 'image-pdf' && (
              <ImagePdfTool onStepChange={setCurrentStep} />
            )}
            {activeTool === 'organizer' && (
              <OrganizerTool onStepChange={setCurrentStep} />
            )}
            {activeTool === 'watermark' && (
              <WatermarkTool onStepChange={setCurrentStep} />
            )}
            {activeTool === 'lock-unlock' && (
              <LockUnlockTool onStepChange={setCurrentStep} />
            )}
          </ErrorBoundary>
        </section>
      </main>

      {!isOnline && (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-40 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 shadow-md dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          Offline Mode — Spark PDF continues working privately
        </div>
      )}

      <Footer />
    </div>
  );
}
