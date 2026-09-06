"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function SubtreeErrorFallbackView({
  title,
  error,
  onReset,
}: {
  title?: string;
  error: Error | null;
  onReset: () => void;
}) {
  const t = useTranslations("SubtreeError");

  return (
    <div className="p-6 rounded-lg border border-red-500/30 bg-card/90 backdrop-blur-sm text-center flex flex-col items-center justify-center min-h-[220px] max-w-lg mx-auto my-4 shadow-xl">
      <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-3 text-red-400">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-mono font-bold text-foreground mb-1">
        {title || t("title")}
      </h3>
      <p className="text-xs text-muted-foreground mb-4 max-w-sm">
        {t("description")}
      </p>
      {error && (
        <div className="bg-background/80 border border-border rounded px-3 py-2 mb-4 w-full text-left overflow-x-auto max-h-24">
          <p className="text-xs font-mono text-red-400/90 break-words">
            {error.message || t("unknownError")}
          </p>
        </div>
      )}
      <Button
        onClick={onReset}
        variant="outline"
        size="sm"
        className="border-brass/50 text-foreground hover:border-brass flex items-center gap-2"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>{t("tryAgainButton")}</span>
      </Button>
    </div>
  );
}

export class SubtreeErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[SubtreeErrorBoundary] Error in ${this.props.componentName || "subtree"}:`, error, errorInfo);

    // Zrzut do diagnostyki (fire-and-forget)
    try {
      const payload = {
        error: error.message || "Subtree Error",
        stack: error.stack,
        url: typeof window !== "undefined" ? window.location.href : "",
        timestamp: new Date().toISOString(),
        userActions: [`error_in_${this.props.componentName || "subtree"}`],
      };

      void fetch("/api/diagnostics/crash-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Ignoruj błędy sieciowe przy zgłaszaniu crashu
      });
    } catch {
      // Ignoruj błędy zrzutu
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SubtreeErrorFallbackView
          title={this.props.fallbackTitle}
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
