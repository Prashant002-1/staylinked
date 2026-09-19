import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CalendarDays, MapPin, Sprout } from 'lucide-react';
import { api, date, json } from './api';
import { useAuth } from './session';
import { AuthForm } from './Entry';
import { Avatar, Brand, ErrorMessage, Loading, SubmitButton } from './ui';
import type { Connection, Event, User } from './types';

export default function Connect() {
  const { eventId } = useParams();
  const auth = useAuth();
  const [portal, setPortal] = useState<{
    event: Event;
    recruiter: Pick<User, 'name' | 'company' | 'headline'>;
    existing: Connection | null;
  } | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('recap');
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState({ highlight: '', conversation: '', interest: '' });
  useEffect(() => {
    let active = true;
    api<typeof portal>(`/portal/${eventId}`)
      .then((data) => {
        if (active) {
          setPortal(data);
          if (data?.existing)
            setValues((v) =>
              v.conversation
                ? v
                : {
                    highlight: data.existing!.highlight,
                    conversation: data.existing!.conversation,
                    interest: data.existing!.interest,
                  },
            );
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [eventId, auth.user?.id]);
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/portal/${eventId}/connect`, { method: 'POST', body: json(values) });
      setStep('done');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (auth.loading) return <Loading />;
  return (
    <div className="connect-page">
      <header className="connect-header">
        <Brand />
        <span>
          {auth.user?.kind === 'candidate' ? (
            <Link to="/profile" className="text-link">
              My profile
              <ArrowUpRightIcon />
            </Link>
          ) : (
            'A hello worth remembering.'
          )}
        </span>
      </header>
      <main className="connect-main">
        {!portal ? (
          <>
            <ErrorMessage message={error} />
            {!error && <Loading text="Opening your invitation…" />}
          </>
        ) : step === 'done' ? (
          <section className="connection-success">
            <span className="success-mark">
              <Check size={35} />
            </span>
            <span className="eyebrow">SAVED. THE CONVERSATION CAN CONTINUE.</span>
            <h1>
              Nice to meet you.
              <br />
              <em>Nice to remember you.</em>
            </h1>
            <p>
              Your recap is now with {portal.recruiter.name.split(' ')[0]}. Add more of your work
              whenever you're ready. It stays connected to this moment.
            </p>
            <div className="success-memory">
              <Avatar name={portal.recruiter.name} />
              <div>
                <strong>
                  {portal.recruiter.name} · {portal.recruiter.company}
                </strong>
                <span>{portal.event.name}</span>
              </div>
              <Check size={17} />
            </div>
            <blockquote>“{values.highlight}”</blockquote>
            <Link to="/profile" className="button primary">
              Add the work behind your story
              <ArrowRight size={18} />
            </Link>
            <button className="text-button" onClick={() => setStep('recap')}>
              Edit your recap
            </button>
            <p className="fine-print">
              A connection, not a job application. The next step stays human.
            </p>
          </section>
        ) : (
          <>
            <div className="invitation-head">
              <span className="eyebrow">YOU MET. NOW KEEP THE CONTEXT.</span>
              <h1>
                A good conversation
                <br />
                shouldn't end there.
              </h1>
              <p>A few words now. Something to remember you by later.</p>
            </div>
            <section className="invitation-person">
              <Avatar name={portal.recruiter.name} size="large" />
              <div>
                <span>You're connecting with</span>
                <h2>{portal.recruiter.name}</h2>
                <p>
                  {portal.recruiter.headline || 'Recruiter'} · {portal.recruiter.company}
                </p>
              </div>
              <Sprout size={24} />
            </section>
            <div className="invitation-event">
              <span>
                <CalendarDays size={14} />
                {portal.event.name}
              </span>
              <span>
                <MapPin size={14} />
                {date(portal.event.date)} · {portal.event.location || 'In person'}
              </span>
            </div>
            <div className="connect-paper">
              <div className="connect-progress">
                <span className={step === 'recap' ? 'active' : ''}>
                  <b>01</b>The conversation
                </span>
                <span className={step === 'account' ? 'active' : ''}>
                  <b>02</b>
                  {auth.user?.kind === 'candidate' ? 'Already you' : 'A place to keep it'}
                </span>
              </div>
              {auth.user?.kind === 'recruiter' ? (
                <div className="portal-preview-note">
                  <h3>This is your candidate portal.</h3>
                  <p>
                    Candidates see your invitation here, then share the detail they want you to
                    remember.
                  </p>
                  {auth.demoMode && (
                    <button
                      className="button primary"
                      onClick={async () => {
                        try {
                          await auth.demo('candidate');
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Try as a demo candidate
                      <ArrowRight size={17} />
                    </button>
                  )}
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        await auth.logout();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Sign out to create a new candidate
                  </button>
                </div>
              ) : step === 'account' ? (
                <>
                  <button className="text-button" onClick={() => setStep('recap')}>
                    <ArrowLeft size={15} />
                    Back to your recap
                  </button>
                  <h2 className="account-title">Make this connection yours.</h2>
                  <p className="muted">
                    An account lets you add work later and keep this connection in one place.
                  </p>
                  <AuthForm
                    candidateOnly
                    onDone={(user) => {
                      if (user.kind === 'candidate') void submit();
                      else setError('Please use a candidate account for this connection.');
                    }}
                  />
                  {busy && <Loading text="Saving your conversation…" />}
                </>
              ) : (
                <form
                  className="form-stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (auth.user?.kind === 'candidate') void submit();
                    else setStep('account');
                  }}
                >
                  {portal.existing && (
                    <div className="existing-connection">
                      <Check size={16} />
                      You're already connected. You can update your recap below.
                    </div>
                  )}
                  <label>
                    One detail to remember you by{' '}
                    <span className="field-hint">Specific beats impressive.</span>
                    <input
                      value={values.highlight}
                      onChange={(e) => setValues((v) => ({ ...v, highlight: e.target.value }))}
                      placeholder="The CRISPR project we talked about"
                      minLength={4}
                      maxLength={180}
                      required
                    />
                  </label>
                  <label>
                    {portal.event.prompt}
                    <textarea
                      value={values.conversation}
                      onChange={(e) => setValues((v) => ({ ...v, conversation: e.target.value }))}
                      placeholder="We talked about my research on… You mentioned your team is working on…"
                      minLength={20}
                      maxLength={3000}
                      rows={5}
                      required
                    />
                    <span className="field-hint">
                      Keep it personal. This is how {portal.recruiter.name.split(' ')[0]} will
                      remember the conversation.
                    </span>
                  </label>
                  <label>
                    A role or area you're interested in <span className="optional">Optional</span>
                    <input
                      value={values.interest}
                      onChange={(e) => setValues((v) => ({ ...v, interest: e.target.value }))}
                      maxLength={300}
                      placeholder="Research lab technician, gene editing…"
                    />
                  </label>
                  <div className="sharing-note">
                    <Sprout size={19} />
                    <p>
                      {portal.recruiter.name.split(' ')[0]} will see this recap, your profile, and
                      any work you add. You can update or remove the connection later.
                    </p>
                  </div>
                  <SubmitButton busy={busy}>
                    {auth.user?.kind === 'candidate'
                      ? portal.existing
                        ? 'Update our connection'
                        : 'Keep our connection'
                      : 'Continue'}
                  </SubmitButton>
                  {auth.user?.kind === 'candidate' && (
                    <div className="signed-in-line">
                      <Avatar name={auth.user.name} size="small" />
                      Sharing as {auth.user.name}
                    </div>
                  )}
                </form>
              )}
              <ErrorMessage message={error} />
            </div>
            <p className="connect-footnote">
              Your words carry the connection. Again just keeps them close.
            </p>
          </>
        )}
      </main>
      <footer className="connect-footer">
        again. <span>Good conversations go somewhere.</span>
      </footer>
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={14} />;
}
