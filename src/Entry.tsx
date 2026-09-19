import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, ScanLine, Users, Sprout, FileCheck2, Quote } from 'lucide-react';
import { useAuth } from './session';
import { api, json } from './api';
import { Brand, Avatar, ErrorMessage, Loading, SubmitButton } from './ui';
import type { User } from './types';

export function AuthForm({
  onDone,
  candidateOnly = false,
}: {
  onDone: (user: User) => void;
  candidateOnly?: boolean;
}) {
  const { setUser } = useAuth();
  const [register, setRegister] = useState(true);
  const [kind, setKind] = useState<User['kind']>('candidate');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const data = Object.fromEntries(new FormData(e.currentTarget));
        try {
          const { user } = await api<{ user: User }>(`/auth/${register ? 'register' : 'login'}`, {
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
      <div className="segmented">
        <button
          type="button"
          className={register ? 'active' : ''}
          onClick={() => setRegister(true)}
        >
          Create account
        </button>
        <button
          type="button"
          className={!register ? 'active' : ''}
          onClick={() => setRegister(false)}
        >
          Sign in
        </button>
      </div>
      {register && (
        <>
          <label>
            Your name
            <input
              name="name"
              autoComplete="name"
              required
              maxLength={180}
              placeholder="Alex Morgan"
            />
          </label>
          {!candidateOnly && (
            <label>
              I'm here as a
              <select value={kind} onChange={(e) => setKind(e.target.value as User['kind'])}>
                <option value="candidate">Candidate</option>
                <option value="recruiter">Recruiter</option>
              </select>
            </label>
          )}
          {kind === 'recruiter' && !candidateOnly && (
            <label>
              Company
              <input name="company" maxLength={120} placeholder="Your company" required />
            </label>
          )}
        </>
      )}
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete={register ? 'new-password' : 'current-password'}
          minLength={register ? 8 : 1}
          maxLength={128}
          required
          placeholder={register ? 'At least 8 characters' : 'Your password'}
        />
      </label>
      <ErrorMessage message={error} />
      <SubmitButton busy={busy}>{register ? 'Create account' : 'Sign in'}</SubmitButton>
    </form>
  );
}

export default function Entry() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [showAuth, setShowAuth] = useState(false);
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
    <main className="entry">
      <section className="entry-story">
        <Brand light />
        <div className="entry-copy">
          <span className="eyebrow light-eyebrow">THE CONVERSATION IS JUST THE START</span>
          <h1>
            Good people.
            <br />
            Great conversation.
            <br />
            <em>Then what?</em>
          </h1>
          <p>
            Keep the spark of an in-person connection.
            <br />
            Find it again when the right role opens.
          </p>
          <div className="memory-preview">
            <div className="preview-top">
              <Avatar name="Aisha Patel" />
              <div>
                <strong>Aisha Patel</strong>
                <span>Met at the NYU career fair</span>
              </div>
              <span className="preview-icon">
                <Sprout size={20} />
              </span>
            </div>
            <Quote size={20} />
            <p>
              “The CRISPR researcher who figured out why the editing results weren't reproducible.”
            </p>
            <div className="preview-footer">
              <span>
                <FileCheck2 size={14} /> Context, with the work behind it.
              </span>
              <ArrowRight size={17} />
            </div>
          </div>
        </div>
        <span className="entry-foot">A little context. A more human way to hire.</span>
      </section>
      <section className="entry-actions">
        <div className="entry-form">
          <span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span>
          <h2>
            A good connection
            <br />
            deserves a next chapter.
          </h2>
          <p className="muted">
            One place for the people you met, what stood out, and the work worth remembering.
          </p>
          {!showAuth && auth.demoMode ? (
            <>
              <button className="entry-option" disabled={!!busy} onClick={() => enter('recruiter')}>
                <span className="option-icon">
                  <Users size={23} />
                </span>
                <span>
                  <strong>{busy === 'recruiter' ? 'Opening…' : 'Explore as a recruiter'}</strong>
                  <small>Meet your next hire, again.</small>
                </span>
                <ArrowRight size={20} />
              </button>
              <button className="entry-option" disabled={!!busy} onClick={() => enter('candidate')}>
                <span className="option-icon">
                  <ScanLine size={23} />
                </span>
                <span>
                  <strong>{busy === 'candidate' ? 'Opening…' : 'Explore as a candidate'}</strong>
                  <small>Give a great conversation somewhere to live.</small>
                </span>
                <ArrowRight size={20} />
              </button>
              <div className="demo-note">
                <span className="status-dot" />
                Interactive demo · Fictional people and materials
              </div>
              <button className="text-button entry-signin" onClick={() => setShowAuth(true)}>
                Or create your own account / sign in <ArrowRight size={15} />
              </button>
            </>
          ) : (
            <>
              <AuthForm
                onDone={(user) => navigate(user.kind === 'recruiter' ? '/workspace' : '/profile')}
              />
              {auth.demoMode && (
                <button className="text-button" onClick={() => setShowAuth(false)}>
                  Back to the demo
                </button>
              )}
            </>
          )}
          <ErrorMessage message={error || auth.error} />
        </div>
        <span className="entry-bottom">Built around a real conversation. Kept in your hands.</span>
      </section>
    </main>
  );
}
