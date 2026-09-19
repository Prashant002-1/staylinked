import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { api, json } from './api';
import { Choice, ErrorMessage, Field, Loading, Modal, SubmitButton } from './ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Event, Role } from './types';

export function ShareQR({
  events,
  initialEvent,
  onClose,
}: {
  events: Event[];
  initialEvent?: string;
  onClose: () => void;
}) {
  const [eventId, setEventId] = useState(initialEvent || events[0]?.id || '');
  const [qr, setQr] = useState<{ image: string; url: string; localOnly: boolean } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    setQr(null);
    setCopied(false);
    setError('');
    if (eventId)
      api<NonNullable<typeof qr>>(`/events/${eventId}/qr`)
        .then((data) => {
          if (active) setQr(data);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [eventId]);
  return (
    <Modal title="Share event QR" onClose={onClose}>
      <Choice
        label="Event"
        value={eventId}
        onChange={setEventId}
        options={events.map((e) => ({ value: e.id, label: e.name }))}
        className="w-full"
      />
      {qr ? (
        <>
          <div className="qr-display">
            <img
              src={qr.image}
              alt={`QR code for ${events.find((e) => e.id === eventId)?.name}`}
              width="240"
              height="240"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-9"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(qr.url);
                  setCopied(true);
                } catch {
                  setError('Select the link below to copy it.');
                }
              }}
            >
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-9"
              render={<a href={`/connect/${eventId}`} target="_blank" rel="noreferrer" />}
              nativeButton={false}
            >
              Preview
              <ExternalLink />
            </Button>
          </div>
          <Input
            value={qr.url}
            aria-label="Connection link"
            readOnly
            onFocus={(e) => e.target.select()}
            className="text-xs text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            {qr.localOnly
              ? 'Local preview. This link opens on this computer.'
              : 'Local preview. Phones must use the same Wi-Fi as this computer.'}
          </p>
        </>
      ) : (
        <Loading />
      )}
      <ErrorMessage message={error} />
    </Modal>
  );
}
export function NewRole({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (role: Role) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal title="Add role" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const data = Object.fromEntries(new FormData(e.currentTarget));
          try {
            const { role } = await api<{ role: Role }>('/roles', {
              method: 'POST',
              body: json({
                ...data,
                requirements: String(data.requirements)
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              }),
            });
            onCreate(role);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Title">
          <Input name="title" required maxLength={180} placeholder="Research Lab Technician" />
        </Field>
        <Field label="Team / location">
          <Input name="team" maxLength={180} placeholder="Gene editing · New York" />
        </Field>
        <Field label="Job description">
          <Textarea name="description" required minLength={20} maxLength={10000} rows={4} />
        </Field>
        <Field label="Requirements" hint="One per line. Up to 12.">
          <Textarea
            name="requirements"
            required
            rows={4}
            placeholder={'CRISPR\nMammalian cell culture\nDNA extraction and PCR'}
          />
        </Field>
        <ErrorMessage message={error} />
        <div className="form-actions">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton busy={busy}>Add role</SubmitButton>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal title="Create event" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const data = Object.fromEntries(new FormData(e.currentTarget));
          try {
            const { event } = await api<{ event: Event }>('/events', {
              method: 'POST',
              body: json(data),
            });
            onCreate(event);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Event name">
          <Input name="name" required maxLength={180} placeholder="University career fair" />
        </Field>
        <div className="form-row">
          <Field label="Location">
            <Input name="location" maxLength={180} placeholder="New York, NY" />
          </Field>
          <Field label="Date">
            <Input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </Field>
        </div>
        <Field label="Conversation prompt">
          <Textarea
            name="prompt"
            required
            minLength={10}
            maxLength={500}
            rows={3}
            defaultValue="What did we talk about? Share the detail you would like me to remember."
          />
        </Field>
        <ErrorMessage message={error} />
        <div className="form-actions">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton busy={busy}>Create event</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
