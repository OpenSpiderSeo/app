import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render errors so project switch does not white-screen the shell. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[OpenSpider] UI error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="os-boot">
          <div className="os-boot__inner">
            <div className="os-boot__mark">OpenSpider</div>
            <p className="projects-home__error">{this.state.error.message}</p>
            <button
              type="button"
              className="os-btn os-btn--primary"
              onClick={() => this.setState({ error: null })}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
