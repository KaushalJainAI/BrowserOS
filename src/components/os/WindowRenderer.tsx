/**
 * Mounts one component per open window.
 *
 * Apps are code-split: the desktop boots with only the shell, and an app's
 * bundle is fetched the first time it is launched. Each instance is wrapped in
 * a `WindowScope` so `useWindowState` reads and writes that window's own
 * `state_data` rather than a global blob.
 */

import { Suspense, lazy, useMemo, type ComponentType } from 'react';
import { useOSWindows, WindowScope } from '../../contexts/osState';
import { Window } from './Window';
import type { AppId } from '../../types/os';
import { AppErrorBoundary } from './AppErrorBoundary';

const LOADERS: Record<AppId, () => Promise<{ default: ComponentType }>> = {
  explorer: () => import('../apps/FileExplorerApp'),
  terminal: () => import('../apps/TerminalApp'),
  settings: () => import('../apps/SettingsApp'),
  clock: () => import('../apps/ClockApp'),
  chatbot: () => import('../apps/ChatbotApp'),
  'image-editor': () => import('../apps/ImageEditorApp'),
  'video-editor': () => import('../apps/VideoEditorApp'),
  'presentation-editor': () => import('../apps/PresentationEditorApp'),
  'word-editor': () => import('../apps/WordEditorApp'),
  'diagram-editor': () => import('../apps/DiagramEditorApp'),
  analyst: () => import('../apps/AnalystApp'),
  'svg-maker': () => import('../apps/SvgMakerApp'),
  'sheets-editor': () => import('../apps/SheetsEditorApp'),
  drive: () => import('../apps/DriveApp'),
  'frontend-expert': () => import('../apps/FrontendExpertApp'),
  calculator: () => import('../apps/CalculatorApp'),
  game: () => import('../apps/GameApp'),
  simulator: () => import('../apps/SimulatorApp'),
  clipboard: () => import('../apps/ClipboardApp'),
  screenshot: () => import('../apps/ScreenshotApp'),
};

// Built by reduce rather than Object.fromEntries: fromEntries widens the key to
// `string`, and the cast back to `Record<AppId, ...>` is not assignable.
const COMPONENTS = (Object.keys(LOADERS) as AppId[]).reduce((acc, id) => {
  acc[id] = lazy(LOADERS[id]);
  return acc;
}, {} as Record<AppId, ComponentType>);

function AppSkeleton() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="os-spinner" />
    </div>
  );
}

export function WindowRenderer() {
  const { windows, activeWindowId } = useOSWindows();

  // Render in a stable id order so React never remounts an app just because
  // z-order changed; stacking is handled entirely by the `zIndex` style.
  const ordered = useMemo(
    () => [...windows].sort((a, b) => a.id.localeCompare(b.id)),
    [windows],
  );

  return (
    <>
      {ordered.map((entry) => {
        const AppContent = COMPONENTS[entry.appId];
        return (
          <Window
            key={entry.id}
            id={entry.id}
            appId={entry.appId}
            title={entry.title}
            isMinimized={entry.isMinimized}
            isMaximized={entry.isMaximized}
            snap={entry.snap}
            zIndex={entry.zIndex}
            isActive={activeWindowId === entry.id}
            rect={entry.rect}
          >
            <WindowScope.Provider value={entry.id}>
              <AppErrorBoundary title={entry.title}>
                <Suspense fallback={<AppSkeleton />}>
                  <AppContent />
                </Suspense>
              </AppErrorBoundary>
            </WindowScope.Provider>
          </Window>
        );
      })}
    </>
  );
}
