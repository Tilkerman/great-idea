import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TiLi render error', error, info.componentStack);
  }

  private onReload = () => {
    window.location.reload();
  };

  private onHardReset = () => {
    try {
      if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.getRegistrations().then((regs) => {
          void Promise.all(regs.map((r) => r.unregister()));
        });
      }
      if ('caches' in window) {
        void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
      }
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="app-fatal">
        <h1 className="app-fatal__title">TiLi не смог открыться</h1>
        <p className="app-fatal__text">
          Часто это старый кэш после обновления. Нажмите «Обновить». Если не помогло — «Сбросить кэш».
        </p>
        <button type="button" className="btn btn--primary app-fatal__btn" onClick={this.onReload}>
          Обновить
        </button>
        <button type="button" className="btn btn--ghost app-fatal__btn" onClick={this.onHardReset}>
          Сбросить кэш и открыть снова
        </button>
      </div>
    );
  }
}
