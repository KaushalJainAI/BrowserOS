/**
 * Contains a crash to the window it happened in.
 *
 * Without this a single throwing app unmounts the whole desktop — including
 * the Buddy panel the user would need to recover. Apps are also a place where
 * agent-supplied state lands, so bad input must degrade to one broken window.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  title: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[BrowserOS] ${this.props.title} crashed:`, error, info.componentStack);
  }

  private retry = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="p-4 rounded-2xl bg-red-500/10 text-red-400">
          <AlertTriangle size={32} />
        </div>
        <div>
          <p className="font-semibold text-[var(--os-text)]">{this.props.title} stopped responding</p>
          <p className="text-xs text-[var(--os-text-dim)] mt-1 max-w-sm font-mono break-words">
            {error.message}
          </p>
        </div>
        <button onClick={this.retry} className="os-button os-button--accent gap-2">
          <RotateCcw size={14} />
          Reload app
        </button>
      </div>
    );
  }
}
