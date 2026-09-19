import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api, date, json } from './api';
import { useAuth } from './session';
import { AuthForm } from './Entry';
import { Avatar, Brand, ErrorMessage, Field, Loading, SubmitButton } from './ui';
import type { Connection, Event, User } from './types';

export default function Connect() {
  const { eventId } = useParams();
  const auth = useAuth();
  const [portal, setPortal] = useState<{
    event: Event;
    recruiter: Pick<User, 'name' | 'headline'>;
    existing: Connection | null;
  } | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('recap');
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState({ highlight: '', conversation: '', interest: '' });
  useEffect(() => {
    let active = true;
    api<NonNullable<typeof portal>>(`/portal/${eventId}`)
      .then((data) => {
        if (!active) return;
        setPortal(data);
        setError('');
        if (data.existing)
          setValues((current) =>
            current.conversation
              ? current
              : {
                  highlight: data.existing!.highlight,
                  conversation: data.existing!.conversation,
                  interest: data.existing!.interest,
                },
          );
      })
      .catch((error) => {
        if (active) setError(error.message);
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
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (auth.loading) return <Loading />;
  const home = auth.user?.kind === 'recruiter' ? '/workspace' : '/profile';
  const firstName = portal?.recruiter.name.split(' ')[0];
  return (
    <div className="connect-page">
      <header className="social-header connect-header">
        <Brand />
        {auth.user && (
          <Button variant="ghost" size="sm" render={<Link to={home} />} nativeButton={false}>
            Your people <ArrowRight />
          </Button>
        )}
      </header>
      <main className="connect-main">
        {!portal ? (
          <>
            <ErrorMessage message={error} />
            {!error && <Loading />}
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
                  <h2>Good to meet you, {firstName}.</h2>
                  <p>{values.highlight}</p>
                  <Button render={<Link to="/profile" />} nativeButton={false}>
                    Your people <ArrowRight />
                  </Button>
                  <Button variant="ghost" onClick={() => setStep('recap')}>
                    Edit your note
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
                      onClick={async () => {
                        try {
                          await auth.demo('candidate');
                        } catch (error) {
                          setError((error as Error).message);
                        }
                      }}
                    >
                      Try as an applicant <ArrowRight />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await auth.logout();
                      } catch (error) {
                        setError((error as Error).message);
                      }
                    }}
                  >
                    Switch account
                  </Button>
                </div>
              ) : step === 'account' ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-4 -ml-2"
                    onClick={() => setStep('recap')}
                  >
                    <ArrowLeft />
                    Back
                  </Button>
                  <h2 className="mb-5">Stay in touch with {firstName}</h2>
                  <AuthForm
                    candidateOnly
                    onDone={(user) => {
                      if (user.kind === 'candidate') void submit();
                      else setError('Use an applicant account to connect.');
                    }}
                  />
                  {busy && <Loading text="Connecting…" />}
                  {auth.user?.kind === 'candidate' && error && (
                    <Button className="mt-4" onClick={() => void submit()} disabled={busy}>
                      Try again
                    </Button>
                  )}
                </>
              ) : (
                <form
                  className="form-stack"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (auth.user?.kind === 'candidate') void submit();
                    else setStep('account');
                  }}
                >
                  <h2>{portal.existing ? 'Our conversation' : `A note for ${firstName}`}</h2>
                  <Field label="The thing we talked about">
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
