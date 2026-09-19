import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from './session';
import { api, json } from './api';
import { Choice, ErrorMessage, Field } from './ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { User } from './types';

export function AuthForm({
  onDone,
  candidateOnly = false,
  onBusyChange,
}: {
  onDone: (user: User) => void;
  candidateOnly?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { setUser } = useAuth();
  const [mode, setMode] = useState('register');
  const [kind, setKind] = useState<User['kind']>('candidate');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
      onBusyChange?.(false);
    },
    [onBusyChange],
  );
  useEffect(() => {
    if (error) errorSummary.current?.focus();
  }, [error]);
  return (
    <Tabs
      value={mode}
      onValueChange={(value) => {
        if (!pending.current) {
          setMode(value);
          setError('');
        }
      }}
    >
      <TabsList className="w-full">
        <TabsTrigger className="flex-1" value="register" disabled={busy}>
          Create account
        </TabsTrigger>
        <TabsTrigger className="flex-1" value="login" disabled={busy}>
          Sign in
        </TabsTrigger>
      </TabsList>
      <TabsContent value={mode}>
        <form
          className="form-stack pt-4"
          aria-busy={busy}
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending.current) return;
            const controller = new AbortController();
            pending.current = controller;
            setBusy(true);
            onBusyChange?.(true);
            setError('');
            const data = Object.fromEntries(new FormData(event.currentTarget));
            try {
              const { user } = await api<{ user: User }>(`/auth/${mode}`, {
                method: 'POST',
                signal: controller.signal,
                body: json({
                  ...data,
                  email: String(data.email).trim(),
                  kind: candidateOnly ? 'candidate' : kind,
                }),
              });
              if (controller.signal.aborted) return;
              setUser(user);
              onDone(user);
            } catch (error) {
              if (!controller.signal.aborted) setError((error as Error).message);
            } finally {
              if (pending.current === controller) pending.current = null;
              if (!controller.signal.aborted) {
                setBusy(false);
                onBusyChange?.(false);
              }
            }
          }}
        >
          <fieldset className="form-stack min-w-0" disabled={busy}>
            {mode === 'register' && (
              <>
                <Field label="Full name">
                  <Input name="name" autoComplete="name" required maxLength={180} />
                </Field>
                {!candidateOnly && (
                  <Field label="Account type">
                    <Choice
                      label="Account type"
                      value={kind}
                      onChange={(value) => setKind(value as User['kind'])}
                      options={[
                        { value: 'candidate', label: 'Applicant' },
                        { value: 'recruiter', label: 'Recruiter' },
                      ]}
                      className="w-full"
                    />
                  </Field>
                )}
                {kind === 'recruiter' && !candidateOnly && (
                  <Field label="Company">
                    <Input name="company" autoComplete="organization" maxLength={120} required />
                  </Field>
                )}
              </>
            )}
            <Field label="Email">
              <Input
                name="email"
                type="email"
                autoComplete={mode === 'login' ? 'username' : 'email'}
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={240}
                required
              />
            </Field>
            <Field label="Password" hint={mode === 'register' ? '8 characters minimum' : undefined}>
              <Input
                name="password"
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                minLength={mode === 'register' ? 8 : 1}
                maxLength={128}
                required
              />
            </Field>
          </fieldset>
          {error && (
            <div ref={errorSummary} tabIndex={-1}>
              <ErrorMessage message={error} />
            </div>
          )}
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy
              ? mode === 'register'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'register'
                ? 'Create account'
                : 'Sign in'}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
