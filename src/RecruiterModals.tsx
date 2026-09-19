import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Eye, Plus, RotateCw } from 'lucide-react';
import { api, json } from './api';
import { useAuth } from './session';
import { Avatar, Choice, ErrorMessage, Field, Loading, Modal, SubmitButton } from './ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Event, Role } from './types';

function useSubmission(onClose: () => void) {
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
  const close = () => {
    mounted.current = false;
    request.current?.abort();
    onClose();
  };
  const submit = async <T,>(
    path: string,
    body: unknown,
    onCreate: (result: T) => void,
    method: 'POST' | 'PATCH' = 'POST',
  ) => {
    if (request.current || !mounted.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const result = await api<T>(path, {
        method,
        body: json(body),
        signal: controller.signal,
      });
      if (mounted.current && !controller.signal.aborted) onCreate(result);
    } catch (error) {
      if (mounted.current && !controller.signal.aborted) setError((error as Error).message);
    } finally {
      if (request.current === controller) request.current = null;
      if (mounted.current && !controller.signal.aborted) setBusy(false);
    }
  };
  return { busy, error, close, submit };
}

export function ShareQR({
  events,
  initialEvent,
  onClose,
  onNewEvent,
  onEventChange,
}: {
  events: Event[];
  initialEvent?: string;
  onClose: () => void;
  onNewEvent: () => void;
  onEventChange: (eventId: string) => void;
}) {
  const { user } = useAuth();
  const [eventId, setEventId] = useState(initialEvent || events[0]?.id || '');
  const [qr, setQr] = useState<{ image: string; url: string; localOnly: boolean } | null>(null);
  const [loading, setLoading] = useState(Boolean(events.length));
  const [error, setError] = useState('');
  const [copyError, setCopyError] = useState('');
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const activeEvent = events.find((event) => event.id === eventId) || events[0];
  const activeEventId = activeEvent?.id;
  const version = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    const currentVersion = ++version.current;
    setQr(null);
    setCopied(false);
    setCopyError('');
    setError('');
    setLoading(Boolean(activeEventId));
    const timeout = activeEventId
      ? window.setTimeout(
          () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
          12_000,
        )
      : undefined;
    if (activeEventId)
      api<NonNullable<typeof qr>>(`/events/${encodeURIComponent(activeEventId)}/qr`, {
        signal: controller.signal,
      })
        .then((data) => {
          if (!controller.signal.aborted && version.current === currentVersion) setQr(data);
        })
        .catch((e) => {
          if (version.current !== currentVersion) return;
          if (controller.signal.reason?.name === 'TimeoutError')
            setError('The code took too long to load. Try again.');
          else if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          window.clearTimeout(timeout);
          if (version.current === currentVersion) setLoading(false);
        });
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      if (version.current === currentVersion) version.current++;
    };
  }, [activeEventId, attempt]);
  const networkHint = qr?.localOnly
    ? 'This link opens on this computer.'
    : qr && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|\.local$/.test(new URL(qr.url).hostname)
      ? 'Phones must use the same Wi-Fi as this computer.'
      : '';
  return (
    <Modal title="Your QR code" onClose={onClose}>
      <div className="section-topline">
        {activeEvent && (
          <Choice
            label="Event"
            value={activeEvent.id}
            onChange={(id) => {
              if (id === activeEventId) return;
              version.current++;
              setQr(null);
              setLoading(true);
              setEventId(id);
              onEventChange(id);
            }}
            options={events.map((e) => ({ value: e.id, label: e.name }))}
            className="flex-1 min-w-0"
          />
        )}
        <Button variant="ghost" size="sm" onClick={onNewEvent}>
          <Plus />
          New event
        </Button>
      </div>
      {qr ? (
        <>
          <div className="qr-display">
            <div className="qr-person">
              <Avatar name={user?.name || ''} />
              <span>
                {user?.name}
                {user?.company && <small className="qr-company">{user.company}</small>}
              </span>
            </div>
            <img
              src={qr.image}
              alt={`Invitation to ${activeEvent?.name}`}
              width="240"
              height="240"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-9"
              onClick={async () => {
                const currentVersion = version.current;
                setCopyError('');
                try {
                  await navigator.clipboard.writeText(qr.url);
                  if (currentVersion === version.current) setCopied(true);
                } catch {
                  if (currentVersion === version.current)
                    setCopyError('Select the link below to copy it.');
                }
              }}
            >
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-9"
              render={
                <Link
                  to={`/connect/${encodeURIComponent(activeEventId || '')}`}
                  aria-label="Preview invitation"
                />
              }
              nativeButton={false}
            >
              Preview
              <Eye />
            </Button>
          </div>
          <Input
            value={qr.url}
            aria-label="Connection link"
            readOnly
            onFocus={(e) => e.target.select()}
            className="text-[13px] text-muted-foreground"
          />
          <span className="sr-only" role="status">
            {copied ? 'Invitation link copied.' : ''}
          </span>
          <ErrorMessage message={copyError} />
          {networkHint && <p className="text-[13px] text-muted-foreground">{networkHint}</p>}
        </>
      ) : loading ? (
        <Loading text="Preparing your code…" />
      ) : error ? (
        <div className="flex flex-col items-start gap-3 py-4">
          <ErrorMessage message={error} />
          <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
            <RotateCw /> Try again
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Create an event to share a code.</p>
      )}
    </Modal>
  );
}
export function NewRole({
  role,
  onClose,
  onCreate,
}: {
  role?: Role;
  onClose: () => void;
  onCreate: (role: Role) => void;
}) {
  const { busy, error, close, submit } = useSubmission(onClose);
  return (
    <Modal title={role ? 'Edit role' : 'Add role'} onClose={close} busy={busy}>
      <form
        key={role?.id || 'new-role'}
        className="form-stack"
        aria-busy={busy}
        onSubmit={async (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget));
          const requirements = String(data.requirements)
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
          const field = e.currentTarget.elements.namedItem('requirements') as HTMLTextAreaElement;
          field.setCustomValidity(
            requirements.length > 12
              ? 'Use up to 12 requirements.'
              : requirements.some((item) => item.length < 1 || item.length > 200) ||
                  !requirements.length
                ? 'Use 1–200 characters per requirement.'
                : '',
          );
          if (!field.reportValidity()) return;
          await submit<{ role: Role }>(
            role ? `/workspace/roles/${encodeURIComponent(role.id)}` : '/roles',
            { ...data, requirements },
            ({ role: savedRole }) => onCreate(savedRole),
            role ? 'PATCH' : 'POST',
          );
        }}
      >
        <Field label="Title">
          <Input
            name="title"
            defaultValue={role?.title}
            required
            maxLength={180}
            placeholder="Product Engineer"
            disabled={busy}
          />
        </Field>
        <Field label="Team / location">
          <Input
            name="team"
            defaultValue={role?.team}
            maxLength={180}
            placeholder="Product · New York"
            disabled={busy}
          />
        </Field>
        <Field label="Job description">
          <Textarea
            name="description"
            defaultValue={role?.description}
            required
            minLength={20}
            maxLength={10000}
            rows={4}
            disabled={busy}
          />
        </Field>
        <Field label="Requirements" hint="One per line. Up to 12.">
          <Textarea
            name="requirements"
            defaultValue={role?.requirements.join('\n')}
            required
            rows={4}
            maxLength={2411}
            disabled={busy}
            onInput={(e) => e.currentTarget.setCustomValidity('')}
            placeholder={'React and TypeScript\nPostgreSQL\nAutomated tests'}
          />
        </Field>
        <ErrorMessage message={error} />
        <div className="form-actions">
          <Button variant="outline" type="button" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <SubmitButton busy={busy}>{role ? 'Save changes' : 'Add role'}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
export function NewEvent({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (event: Event) => void;
}) {
  const { busy, error, close, submit } = useSubmission(onClose);
  const today = new Date();
  const localDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  return (
    <Modal title="Create event" onClose={close} busy={busy}>
      <form
        className="form-stack"
        aria-busy={busy}
        onSubmit={async (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget));
          await submit<{ event: Event }>('/events', data, ({ event }) => onCreate(event));
        }}
      >
        <Field label="Event name">
          <Input
            name="name"
            required
            maxLength={180}
            placeholder="University career fair"
            disabled={busy}
          />
        </Field>
        <div className="form-row">
          <Field label="Location">
            <Input name="location" maxLength={180} placeholder="New York, NY" disabled={busy} />
          </Field>
          <Field label="Date">
            <Input name="date" type="date" defaultValue={localDate} required disabled={busy} />
          </Field>
        </div>
        <Field label="Meeting prompt">
          <Textarea
            name="prompt"
            required
            minLength={10}
            maxLength={500}
            rows={3}
            disabled={busy}
            defaultValue="What did we talk about? Share the detail you would like me to remember."
          />
        </Field>
        <ErrorMessage message={error} />
        <div className="form-actions">
          <Button variant="outline" type="button" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <SubmitButton busy={busy}>Create event</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
