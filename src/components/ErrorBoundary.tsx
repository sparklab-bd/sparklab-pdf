import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred while processing your file.',
    };
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-8 max-w-xl rounded-2xl border border-rose-200 bg-[#FFFFFF] p-6 text-center shadow-sm dark:border-rose-900 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-[#E11D48] dark:bg-rose-950/40">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-lg font-bold text-[#0F172A] dark:text-white">
            Spark PDF Auto-Recovery
          </h2>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#E11D48] px-5 py-2.5 text-base font-semibold text-white hover:bg-[#BE123C]"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Tool</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
