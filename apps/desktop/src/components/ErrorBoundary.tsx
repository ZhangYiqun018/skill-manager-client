import { Component, type ErrorInfo, type ReactNode } from "react";
import { copy, type Language } from "../i18n";
import styles from "./ErrorBoundary.module.css";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  language?: Language;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <DefaultErrorFallback error={this.state.error} language={this.props.language} />;
    }
    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  language = "en",
}: {
  error: Error | null;
  language?: Language;
}) {
  const text = copy[language];
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.emoji}>💥</div>
        <h2 className={styles.title}>{text.errorBoundaryTitle}</h2>
        <p className={styles.body}>{text.errorBoundaryBody}</p>
        {error?.message ? <pre className={styles.errorPre}>{error.message}</pre> : null}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={styles.reloadButton}
        >
          {text.errorBoundaryReload}
        </button>
      </div>
    </div>
  );
}
