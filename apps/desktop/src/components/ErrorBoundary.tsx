import { Component, type ErrorInfo, type ReactNode } from "react";
import { copy, type Language } from "../i18n";

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

function DefaultErrorFallback({ error, language = "en" }: { error: Error | null; language?: Language }) {
  const text = copy[language];
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--sm-bg, hsl(42 24% 96%))",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          textAlign: "center",
          background: "var(--sm-surface, #fff)",
          border: "1px solid var(--sm-border, hsl(42 12% 85%))",
          borderRadius: 16,
          padding: "32px 28px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>💥</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, color: "var(--sm-text, #2a2a2a)" }}>
          {text.errorBoundaryTitle}
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--sm-text-secondary, #5a5a5a)", lineHeight: 1.5 }}>
          {text.errorBoundaryBody}
        </p>
        {error?.message ? (
          <pre
            style={{
              textAlign: "left",
              fontSize: 12,
              background: "var(--sm-bg-elevated, hsl(42 12% 92%))",
              padding: 12,
              borderRadius: 8,
              color: "var(--sm-danger, #b42318)",
              overflow: "auto",
              maxHeight: 160,
              marginBottom: 20,
            }}
          >
            {error.message}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: "var(--sm-primary, hsl(205 55% 45%))",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {text.errorBoundaryReload}
        </button>
      </div>
    </div>
  );
}
