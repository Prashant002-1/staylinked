import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, MapPin } from 'lucide-react';
import { api, date, json } from './api';
import { ErrorMessage, Loading, Modal, SubmitButton } from './ui';
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
      api<{ image: string; url: string; localOnly: boolean }>(`/events/${eventId}/qr`)
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
  const event = events.find((e) => e.id === eventId);
  return (
    <Modal title="Keep this conversation going." onClose={onClose}>
      <p className="muted">Let them scan. They add the context, you get the connection.</p>
      <label className="standalone-label">
        Your event
        <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {events.map((e) => (
            <option value={e.id} key={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
      {qr ? (
        <>
          <div className="qr-sheet">
            <span className="eyebrow">NICE TO MEET YOU.</span>
            <img
              src={qr.image}
              alt={`Scan to connect at ${event?.name}`}
              width="240"
              height="240"
            />
            <h3>Let's remember this.</h3>
            <span>{event?.name}</span>
            <small>
              <MapPin size={13} />
              {event?.location} · {event && date(event.date)}
            </small>
          </div>
          <div className="qr-actions">
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(qr.url);
                  setCopied(true);
                } catch {
                  setError('Copy is unavailable here. Select the link below to copy it.');
                }
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}{' '}
              {copied ? 'Link copied' : 'Copy link'}
            </button>
            <a
              className="button secondary"
              href={`/connect/${eventId}`}
              target="_blank"
              rel="noreferrer"
            >
              Open portal <ExternalLink size={15} />
            </a>
          </div>
          <input
            className="copy-url"
            value={qr.url}
            aria-label="Connection link"
            readOnly
            onFocus={(e) => e.target.select()}
          />
          <p className="fine-print">
            {qr.localOnly
              ? 'This link opens on this computer. Set PUBLIC_URL in .env to your laptop’s Wi-Fi address for phone scans.'
              : 'For this local demo, connect the phone and laptop to the same Wi-Fi. Keep the server running.'}
          </p>
        </>
      ) : (
        <Loading text="Preparing your QR code…" />
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
    <Modal title="A new role. A familiar face?" onClose={onClose}>
      <p className="muted">
        Add the role and the experience you want to explore. Again connects each requirement to the
        work people shared.
      </p>
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
        <label>
          Role title
          <input name="title" required maxLength={180} placeholder="Research Lab Technician" />
        </label>
        <label>
          Team or location
          <input name="team" maxLength={180} placeholder="Gene editing · New York" />
        </label>
        <label>
          Job description
          <textarea
            name="description"
            required
            minLength={20}
            maxLength={10000}
            rows={4}
            placeholder="What will this person work on?"
          />
        </label>
        <label>
          Experience to explore{' '}
          <span className="field-hint">One requirement per line, up to 12.</span>
          <textarea
            name="requirements"
            required
            rows={4}
            placeholder={'CRISPR\nMammalian cell culture\nDNA extraction and PCR'}
          />
        </label>
        <ErrorMessage message={error} />
        <SubmitButton busy={busy}>Add role</SubmitButton>
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
    <Modal title="Make room for good conversations." onClose={onClose}>
      <p className="muted">One QR for your event. A personal recap from every candidate.</p>
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
        <label>
          Event name
          <input name="name" required maxLength={180} placeholder="University career fair" />
        </label>
        <div className="form-row">
          <label>
            Location
            <input name="location" maxLength={180} placeholder="Brooklyn, NY" />
          </label>
          <label>
            Date
            <input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </label>
        </div>
        <label>
          The question candidates answer
          <textarea
            name="prompt"
            required
            minLength={10}
            maxLength={500}
            rows={3}
            defaultValue="What did we talk about? Share the detail you would like me to remember."
          />
        </label>
        <ErrorMessage message={error} />
        <SubmitButton busy={busy}>Create event & QR</SubmitButton>
      </form>
    </Modal>
  );
}
