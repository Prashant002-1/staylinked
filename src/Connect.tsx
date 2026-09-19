import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError, date, json } from './api';
import { useAuth } from './session';
import { AuthForm } from './AuthForm';
import { Avatar, Brand, ErrorMessage, Field, Loading, SubmitButton } from './ui';
import type { Connection, Event, User } from './types';

type Draft = { highlight: string; conversation: string; interest: string };

export default function Connect() {
  const { eventId } = useParams();
  const auth = useAuth();
  const [handoff, setHandoff] = useState<{ userId: string; draft: Draft } | null>(null);
  useEffect(() => {
    if (handoff && auth.user?.id === handoff.userId) setHandoff(null);
  }, [auth.user?.id, handoff]);
  return (
    <ConnectPage
      key={auth.user?.id || 'anonymous'}
      eventId={eventId}
      initialDraft={handoff && handoff.userId === auth.user?.id ? handoff.draft : null}
      onAuthenticated={(user, draft) => setHandoff({ userId: user.id, draft })}
    />
  );
}

function ConnectPage({
  eventId,
  initialDraft,
  onAuthenticated,
}: {
  eventId: string | undefined;
  initialDraft: Draft | null;
  onAuthenticated: (user: User, draft: Draft) => void;
}) {
  const auth = useAuth();
  const [portal, setPortal] = useState<{
    event: Event;
    recruiter: Pick<User, 'name' | 'headline'>;
    existing: Connection | null;
  } | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const [accountAction, setAccountAction] = useState<'demo' | 'logout' | null>(null);
  const [step, setStep] = useState(initialDraft ? 'connecting' : 'recap');
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [values, setValues] = useState<Draft>(
    initialDraft || { highlight: '', conversation: '', interest: '' },
  );
  const loginDraft = useRef(initialDraft);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) stepHeading.current?.focus();
    previousStep.current = step;
  }, [step]);
  const mounted = useRef(true);
  const submission = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      submission.current?.abort();
    };
  }, []);
  const submit = useCallback(
    async (draft: Draft) => {
      if (submission.current) return;
      const controller = new AbortController();
      submission.current = controller;
      setBusy(true);
      setError('');
      try {
        const { connection } = await api<{ connection: Connection }>(`/portal/${eventId}/connect`, {
          method: 'POST',
          body: json(draft),
          signal: controller.signal,
        });
        if (mounted.current && !controller.signal.aborted) {
          setPortal((current) => (current ? { ...current, existing: connection } : current));
          setValues(draft);
          setStep('done');
        }
      } catch (error) {
        if (mounted.current && !controller.signal.aborted) {
          setError((error as Error).message);
          setStep('recap');
        }
      } finally {
        if (submission.current === controller) submission.current = null;
        if (mounted.current && !controller.signal.aborted) setBusy(false);
      }
    },
    [eventId],
  );
  useEffect(() => {
    if (auth.loading) return;
    const controller = new AbortController();
    setPortal(null);
    setError('');
    setUnavailable(false);
    api<NonNullable<typeof portal>>(`/portal/${eventId}`, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setPortal(data);
        const draft = loginDraft.current;
        if (draft) {
          loginDraft.current = null;
          void submit(draft);
        } else if (data.existing) {
          setValues({
            highlight: data.existing.highlight,
            conversation: data.existing.conversation,
            interest: data.existing.interest,
          });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setUnavailable(error instanceof ApiError && error.status === 404);
          setError(
            error instanceof ApiError
              ? error.message
              : 'Could not open this invitation. Please try again.',
          );
        }
      });
    return () => controller.abort();
  }, [eventId, auth.loading, submit, attempt]);
  if (auth.loading) return <Loading />;
  const home = auth.user?.kind === 'recruiter' ? '/workspace' : '/profile';
  const firstName = portal?.recruiter.name.split(' ')[0];
  return (
    <div className="connect-page">
      <header className="app-header connect-header">
        <Brand />
        {auth.user && (
          <Button variant="ghost" size="sm" render={<Link to={home} />} nativeButton={false}>
            Connections <ArrowRight />
          </Button>
        )}
      </header>
      <main className="connect-main">
        {!portal ? (
          <>
            {error ? (
              <div className="form-stack">
                <h1 className="text-xl font-semibold">
                  {unavailable ? 'Invitation unavailable' : 'Could not open this invitation'}
                </h1>
                <ErrorMessage message={error} />
                {unavailable ? (
                  <Button
                    variant="outline"
                    render={<Link to={auth.user ? home : '/'} />}
                    nativeButton={false}
                  >
                    Back <ArrowRight />
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
                    Try again
                  </Button>
                )}
              </div>
            ) : (
              <Loading />
            )}
          </>
        ) : (
          <>
            <div className="portal-person">
              <Avatar name={portal.recruiter.name} size="large" />
              <h1>{portal.recruiter.name}</h1>
              {portal.recruiter.headline && <p>{portal.recruiter.headline}</p>}
              <span>
                {portal.event.name} · {date(portal.event.date)}
              </span>
            </div>
            <section className="connect-form-card">
              {step === 'done' ? (
                <div className="connect-success">
                  <h2 ref={stepHeading} tabIndex={-1}>
                    Your note is shared with {firstName}.
                  </h2>
                  <p>{values.highlight}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button render={<Link to="/profile?view=profile" />} nativeButton={false}>
                      Add your work <ArrowRight />
                    </Button>
                    {portal.existing && (
                      <Button
                        variant="outline"
                        render={
                          <Link to={`/profile?person=${encodeURIComponent(portal.existing.id)}`} />
                        }
                        nativeButton={false}
                      >
                        View connection
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="link"
                    className="px-0 text-muted-foreground"
                    onClick={() => setStep('recap')}
                  >
                    Edit note
                  </Button>
                </div>
              ) : auth.user?.kind === 'recruiter' ? (
                <div className="form-stack">
                  <h2>
                    {auth.user.name === portal.recruiter.name
                      ? 'Your invitation'
                      : `Connect with ${firstName}`}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Open this link with an applicant account.
                  </p>
                  {auth.demoMode && (
                    <Button
                      disabled={!!accountAction}
                      onClick={async () => {
                        setAccountAction('demo');
                        try {
                          await auth.demo('candidate');
                        } catch (error) {
                          if (mounted.current) setError((error as Error).message);
                        } finally {
                          if (mounted.current) setAccountAction(null);
                        }
                      }}
                    >
                      {accountAction === 'demo' ? 'Switching…' : 'Try as an applicant'}{' '}
                      <ArrowRight />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    disabled={!!accountAction}
                    onClick={async () => {
                      setAccountAction('logout');
                      try {
                        await auth.logout();
                      } catch (error) {
                        if (mounted.current) setError((error as Error).message);
                      } finally {
                        if (mounted.current) setAccountAction(null);
                      }
                    }}
                  >
                    {accountAction === 'logout' ? 'Signing out…' : 'Switch account'}
                  </Button>
                </div>
              ) : step === 'connecting' ? (
                <Loading text="Connecting…" />
              ) : step === 'account' ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-4 -ml-2"
                    disabled={authBusy}
                    onClick={() => setStep('recap')}
                  >
                    <ArrowLeft />
                    Back
                  </Button>
                  <h2 ref={stepHeading} tabIndex={-1} className="mb-5">
                    Stay in touch with {firstName}
                  </h2>
                  <AuthForm
                    candidateOnly
                    onBusyChange={setAuthBusy}
                    onDone={(user) => {
                      if (user.kind === 'candidate') onAuthenticated(user, values);
                      else setError('Use an applicant account to connect.');
                    }}
                  />
                </>
              ) : (
                <form
                  className="form-stack"
                  aria-busy={busy}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (auth.user?.kind === 'candidate') void submit(values);
                    else setStep('account');
                  }}
                >
                  <h2 ref={stepHeading} tabIndex={-1}>
                    {portal.existing ? 'Your meeting note' : `A note for ${firstName}`}
                  </h2>
                  <fieldset className="form-stack min-w-0" disabled={busy}>
                    <Field label="A detail to remember">
                      <Input
                        value={values.highlight}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, highlight: event.target.value }))
                        }
                        placeholder="Our conversation about accessible design"
                        required
                        minLength={4}
                        maxLength={180}
                      />
                    </Field>
                    <Field label={portal.event.prompt}>
                      <Textarea
                        value={values.conversation}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, conversation: event.target.value }))
                        }
                        placeholder="We discussed…"
                        required
                        minLength={20}
                        maxLength={3000}
                        rows={5}
                      />
                    </Field>
                    <Field label="What you're interested in" hint="Optional">
                      <Input
                        value={values.interest}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, interest: event.target.value }))
                        }
                        placeholder="Product engineering, design systems"
                        maxLength={300}
                      />
                    </Field>
                  </fieldset>
                  {!portal.existing && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {firstName} will be able to see your profile and work.
                    </p>
                  )}
                  <SubmitButton busy={busy}>
                    {auth.user?.kind === 'candidate'
                      ? portal.existing
                        ? 'Save changes'
                        : 'Connect'
                      : 'Continue'}
                  </SubmitButton>
                </form>
              )}
              <ErrorMessage message={error} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
