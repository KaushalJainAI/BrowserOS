import { useOS } from '../../contexts/OSContext';
import { Window } from './Window';
import { ClockApp } from '../apps/ClockApp';
import { TerminalApp } from '../apps/TerminalApp';
import { SettingsApp } from '../apps/SettingsApp';
import { FileExplorerApp } from '../apps/FileExplorerApp';
import { ChatbotApp } from '../apps/ChatbotApp';
import { ImageEditorApp } from '../apps/ImageEditorApp';
import { VideoEditorApp } from '../apps/VideoEditorApp';
import { PresentationEditorApp } from '../apps/PresentationEditorApp';
import { WordEditorApp } from '../apps/WordEditorApp';
import { DiagramEditorApp } from '../apps/DiagramEditorApp';
import { AnalystApp } from '../apps/AnalystApp';
import { SvgMakerApp } from '../apps/SvgMakerApp';
import { SheetsEditorApp } from '../apps/SheetsEditorApp';
import { DriveApp } from '../apps/DriveApp';
import { FrontendExpertApp } from '../apps/FrontendExpertApp';
import { CalculatorApp } from '../apps/CalculatorApp';
import { GameApp } from '../apps/GameApp';
import { SimulatorApp } from '../apps/SimulatorApp';
import { ClipboardApp } from '../apps/ClipboardApp';
import { ScreenshotApp } from '../apps/ScreenshotApp';

export function WindowRenderer() {
  const { windows, activeWindowId } = useOS();

  return (
    <>
      {windows.map(win => {
        let AppContent;
        switch(win.appId) {
          case 'clock': AppContent = ClockApp; break;
          case 'settings': AppContent = SettingsApp; break;
          case 'terminal': AppContent = TerminalApp; break;
          case 'chatbot': AppContent = ChatbotApp; break;
          case 'image-editor': AppContent = ImageEditorApp; break;
          case 'video-editor': AppContent = VideoEditorApp; break;
          case 'presentation-editor': AppContent = PresentationEditorApp; break;
          case 'word-editor': AppContent = WordEditorApp; break;
          case 'diagram-editor': AppContent = DiagramEditorApp; break;
          case 'analyst': AppContent = AnalystApp; break;
          case 'svg-maker': AppContent = SvgMakerApp; break;
          case 'sheets-editor': AppContent = SheetsEditorApp; break;
          case 'drive': AppContent = DriveApp; break;
          case 'frontend-expert': AppContent = FrontendExpertApp; break;
          case 'calculator': AppContent = CalculatorApp; break;
          case 'game': AppContent = GameApp; break;
          case 'simulator': AppContent = SimulatorApp; break;
          case 'clipboard': AppContent = ClipboardApp; break;
          case 'screenshot': AppContent = ScreenshotApp; break;
          case 'explorer': default: AppContent = FileExplorerApp; break;
        }

        return (
          <Window
            key={win.id}
            id={win.id}
            title={win.title}
            isMinimized={win.isMinimized}
            isMaximized={win.isMaximized}
            zIndex={win.zIndex}
            isActive={activeWindowId === win.id}
            defaultPosition={win.defaultPosition}
          >
            {/* @ts-ignore - Some apps don't take props yet */}
            <AppContent isMaximized={win.isMaximized} />
          </Window>
        );
      })}
    </>
  );
}
