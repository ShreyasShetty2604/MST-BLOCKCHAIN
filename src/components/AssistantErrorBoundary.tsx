import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

/** Keeps a failed Assistant render from taking the patient app blank. */
export class AssistantErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('MediVault Assistant render error', error, info.componentStack);
  }

  retry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 shadow-card space-y-3">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
          <AlertTriangle className="w-5 h-5" />
          <h1 className="font-bold">Assistant couldn't load this response.</h1>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">Your medical records have not been changed. Please retry the Assistant.</p>
        <button onClick={this.retry} className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
        {import.meta.env.DEV && <pre className="text-[10px] whitespace-pre-wrap text-rose-700 dark:text-rose-300">{this.state.error.message}</pre>}
      </div>
    );
  }
}
