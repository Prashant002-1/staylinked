import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
      <header className="candidate-header">
        <Brand />
        {auth.user?.kind === 'candidate' && (
          <Button variant="ghost" size="sm" render={<Link to="/profile" />} nativeButton={false}>
            My profile
            <ArrowRight />
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
              <p>
                {portal.recruiter.headline || 'Recruiter'} · {portal.recruiter.company}
              </p>
              <span>
                <CalendarDays className="size-3.5" />
                {portal.event.name} · {date(portal.event.date)}
              </span>
            </div>
            <section className="connect-form-card">
              {step === 'done' ? (
                <div className="connect-success">
                  <span className="success-icon">
                    <Check />
                  </span>
                  <h2>Connection saved</h2>
                  <p>{values.highlight}</p>
                  <Button render={<Link to="/profile" />} nativeButton={false}>
                    Go to my profile
                    <ArrowRight />
                  </Button>
                  <Button variant="ghost" onClick={() => setStep('recap')}>
                    Edit recap
                  </Button>
                </div>
              ) : auth.user?.kind === 'recruiter' ? (
                <div className="form-stack">
                  <Badge variant="secondary" className="w-fit">
                    Candidate portal preview
                  </Badge>
                  <h2>Connect with {portal.recruiter.name.split(' ')[0]}</h2>
                  {auth.demoMode && (
                    <Button
                      onClick={async () => {
                        try {
                          await auth.demo('candidate');
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Open as demo candidate
                      <ArrowRight />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await auth.logout();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Sign out
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
                  <h2 className="mb-5">Save your connection</h2>
                  <AuthForm
                    candidateOnly
                    onDone={(user) => {
                      if (user.kind === 'candidate') void submit();
                      else setError('Use a candidate account to connect.');
                    }}
                  />
                  {busy && <Loading text="Saving connection…" />}
                  {auth.user?.kind === 'candidate' && error && (
                    <Button className="mt-4" onClick={() => void submit()} disabled={busy}>
                      Retry saving
                    </Button>
                  )}
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
                  <div className="flex items-center justify-between">
                    <h2>{portal.existing ? 'Update your recap' : 'Your conversation'}</h2>
                    {portal.existing && (
                      <Badge variant="secondary">
                        <Check className="size-3" />
                        Connected
                      </Badge>
                    )}
                  </div>
                  <Field label="The detail to remember">
                    <Input
                      value={values.highlight}
                      onChange={(e) => setValues((v) => ({ ...v, highlight: e.target.value }))}
                      placeholder="Our conversation about CRISPR delivery"
                      required
                      minLength={4}
                      maxLength={180}
                    />
                  </Field>
                  <Field label={portal.event.prompt}>
                    <Textarea
                      value={values.conversation}
                      onChange={(e) => setValues((v) => ({ ...v, conversation: e.target.value }))}
                      placeholder="We discussed…"
                      required
                      minLength={20}
                      maxLength={3000}
                      rows={5}
                    />
                  </Field>
                  <Field label="Role / area of interest" hint="Optional">
                    <Input
                      value={values.interest}
                      onChange={(e) => setValues((v) => ({ ...v, interest: e.target.value }))}
                      placeholder="Lab technician · gene editing"
                      maxLength={300}
                    />
                  </Field>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Your profile, work, and future updates will be shared with{' '}
                    {portal.recruiter.name.split(' ')[0]}. You can remove this connection from your
                    profile.
                  </p>
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
