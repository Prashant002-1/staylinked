import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from './session';
import { api, json } from './api';
import { Avatar, Brand, ErrorMessage, Loading, SubmitButton, Field, Choice } from './ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { User } from './types';
export function AuthForm({
  onDone,
  candidateOnly = false,
}: {
  onDone: (user: User) => void;
  candidateOnly?: boolean;
}) {
  const { setUser } = useAuth();
  const [mode, setMode] = useState('register');
  const [kind, setKind] = useState<User['kind']>('candidate');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Tabs
      value={mode}
      onValueChange={(v) => {
        setMode(v);
        setError('');
      }}
    >
      <TabsList className="w-full">
        <TabsTrigger className="flex-1" value="register">
          Create account
        </TabsTrigger>
        <TabsTrigger className="flex-1" value="login">
          Sign in
        </TabsTrigger>
      </TabsList>
      <TabsContent value={mode}>
        <form
          className="form-stack pt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            const data = Object.fromEntries(new FormData(e.currentTarget));
            try {
              const { user } = await api<{ user: User }>(`/auth/${mode}`, {
                method: 'POST',
                body: json({ ...data, kind: candidateOnly ? 'candidate' : kind }),
              });
              setUser(user);
              onDone(user);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
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
                    onChange={(v) => setKind(v as User['kind'])}
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
                  <Input name="company" maxLength={120} required />
                </Field>
              )}
            </>
          )}
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" required />
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
          <ErrorMessage message={error} />
          <SubmitButton busy={busy}>
            {mode === 'register' ? 'Create account' : 'Sign in'}
          </SubmitButton>
        </form>
      </TabsContent>
    </Tabs>
  );
}
export default function Entry() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('demo');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  if (auth.loading) return <Loading />;
  if (auth.user)
    return <Navigate to={auth.user.kind === 'recruiter' ? '/workspace' : '/profile'} replace />;
  const enter = async (kind: User['kind']) => {
    setBusy(kind);
    try {
      await auth.demo(kind);
      navigate(kind === 'recruiter' ? '/workspace' : '/profile');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };
  return (
    <main className="auth-page">
      <header>
        <Brand />
      </header>
      <section className="auth-card">
        <div className="mb-7">
          <h1 className="text-2xl font-semibold tracking-tight">Continue to Staylinked</h1>
        </div>
        {auth.demoMode && mode === 'demo' ? (
          <>
            <div className="space-y-3">
              {(['recruiter', 'candidate'] as const).map((kind) => (
                <Button
                  key={kind}
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => enter(kind)}
                  className="auth-option"
                >
                  <Avatar name={kind === 'recruiter' ? 'Maya Chen' : 'Aisha Patel'} />
                  <span className="flex-1 text-left">
                    <strong className="block text-sm font-medium">
                      {kind === 'recruiter' ? 'Maya Chen' : 'Aisha Patel'}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      {kind === 'recruiter' ? 'Recruiter demo' : 'Applicant demo'}
                    </span>
                  </span>
                  {busy === kind ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                </Button>
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <Button variant="link" size="sm" onClick={() => setMode('account')}>
                Use your account <ArrowRight />
              </Button>
            </div>
          </>
        ) : (
          <>
            <AuthForm
              onDone={(user) => navigate(user.kind === 'recruiter' ? '/workspace' : '/profile')}
            />
            {auth.demoMode && (
              <Button variant="ghost" className="w-full mt-4" onClick={() => setMode('demo')}>
                Back to demo
              </Button>
            )}
          </>
        )}
        <ErrorMessage message={error || auth.error} />
      </section>
    </main>
  );
}
