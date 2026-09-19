import { AlertCircle, Loader2 } from 'lucide-react';

export function Loading({ text = 'Loading…' }: { text?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"
      role="status"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {text}
    </div>
  );
}

export function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <div className="error-message" role="alert">
      <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
      {message}
    </div>
  ) : null;
}
