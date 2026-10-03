"use client";
import { Component, ReactNode } from "react";
import { Loader2, Inbox, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn("h-5 w-5 animate-spin text-brand-500", className)} aria-label="Loading" />;
export const PageLoader = () => <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="h-8 w-8" /></div>;
export const Card = ({ className, children }: { className?: string; children: ReactNode }) => <div className={cn("card", className)}>{children}</div>;
export const EmptyState = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-500"><Inbox className="h-10 w-10" /><p className="font-medium">{title}</p>{hint && <p className="text-sm">{hint}</p>}</div>
);
export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div className="flex-1">{message}</div>
    {onRetry && <button className="font-semibold underline" onClick={onRetry}>Retry</button>}
  </div>
);
export const Stat = ({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) => (
  <Card className="p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p>{sub && <p className="text-xs text-slate-500">{sub}</p>}</Card>
);

export class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return <div className="mx-auto max-w-md p-8"><ErrorBox message={`Something broke: ${this.state.err.message}`} onRetry={() => this.setState({ err: null })} /></div>;
  }
}
