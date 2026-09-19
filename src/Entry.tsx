import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from './session';
import { Avatar, Brand, ErrorMessage, Loading } from './ui';
import { AuthForm } from './AuthForm';
import { Button } from '@/components/ui/button';
import type { User } from './types';
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
