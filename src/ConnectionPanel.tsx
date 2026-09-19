import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronDown,
  FileText,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Unlink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { api, date, json } from './api';
import { Avatar, Choice, Empty, ErrorMessage, ExternalLink, Loading, Modal } from './ui';
import { MaterialPreview } from './Profile';
import type { Brief, Connection, Material, Message, Role, Source, User } from './types';

export default function ConnectionPanel({
  connection: c,
  connections,
  user,
  roles,
  onClose,
  onChange,
  onNewRole,
}: {
  connection: Connection;
  connections: Connection[];
  user: User;
  roles: Role[];
  onClose: () => void;
  onChange: () => void;
  onNewRole: () => void;
}) {
  const recruiter = user.kind === 'recruiter';
  const person = recruiter ? c.candidate : c.recruiter!;
  const encounters = connections
    .filter((other) => other.candidateId === c.candidateId && other.recruiterId === c.recruiterId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [thread, setThread] = useState(c.id);
  const current = encounters.find((e) => e.id === thread) || c;
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [material, setMaterial] = useState<Material | null>(null);
  const [remove, setRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const requestVersion = useRef(0);
  const activeThread = useRef<string | null>(thread);
  const sendingRequest = useRef(false);
  const loadMessages = useCallback(async () => {
    if (activeThread.current !== thread || sendingRequest.current) return;
    const version = ++requestVersion.current;
    try {
      const data = await api<{ messages: Message[] }>(`/connections/${thread}/messages`);
      if (activeThread.current !== thread || version !== requestVersion.current) return;
      setMessages(data.messages);
      setError('');
    } catch (e) {
      if (activeThread.current === thread && version === requestVersion.current)
        setError((e as Error).message);
    }
  }, [thread]);
  useEffect(() => {
    activeThread.current = thread;
    sendingRequest.current = false;
    setSending(false);
    setMessages(null);
    setError('');
    setText('');
    void loadMessages();
    const interval = setInterval(() => {
      if (!document.hidden) void loadMessages();
    }, 15000);
    return () => {
      activeThread.current = null;
      requestVersion.current++;
      clearInterval(interval);
    };
  }, [thread, loadMessages]);
  return (
    <>
      <div className="connection-topline">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft />
          Back to people
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" aria-label="Connection options" />}
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRemove(true)}>
              <Unlink />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="relationship-layout">
        <aside className="person-about">
          <Avatar name={person.name} size="large" />
          <h1>{person.name}</h1>
          <p className="profile-headline">{person.headline}</p>
          {person.location && (
            <p className="profile-location">
              <MapPin size={13} />
              {person.location}
            </p>
          )}
          {person.bio && <p className="profile-bio">{person.bio}</p>}
          {!!person.links.length && (
            <div className="profile-links">
              {person.links.map((l) => (
                <ExternalLink url={l.url} key={l.url}>
                  {l.label || new URL(l.url).hostname}
                </ExternalLink>
              ))}
            </div>
          )}
          {recruiter && (
            <section className="shared-work">
              <h2>What I’ve been making</h2>
              {c.materials.length ? (
                c.materials.map((m) => (
                  <button className="work-link" key={m.id} onClick={() => setMaterial(m)}>
                    <FileText size={17} />
                    <span>
                      {m.title}
                      <small>{date(m.updatedAt || m.createdAt)}</small>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No work shared yet.</p>
              )}
            </section>
          )}
          {recruiter && (
            <section className="role-context">
              <button
                className="role-toggle"
                aria-expanded={roleOpen}
                onClick={() => setRoleOpen(!roleOpen)}
              >
                <BriefcaseBusiness size={16} />A role in mind?
                <ChevronDown size={15} className={roleOpen ? 'rotate-180' : ''} />
              </button>
              {roleOpen && (
                <RoleContext
                  key={current.id}
                  connection={current}
                  roles={roles}
                  onNewRole={onNewRole}
                />
              )}
            </section>
          )}
        </aside>
        <section
          className="relationship-conversation"
          aria-label={`Conversation with ${person.name}`}
        >
          {encounters.length > 1 && (
            <fieldset disabled={sending} className="mb-5 min-w-0">
              <Choice
                label="Conversation from event"
                value={thread}
                options={encounters.map((e) => ({ value: e.id, label: e.event.name }))}
                onChange={(value) => {
                  if (!sendingRequest.current) setThread(value);
                }}
                className="w-full"
              />
            </fieldset>
          )}
          <div className="meeting-memory">
            <div className="meeting-meta">
              <span>WHERE WE MET</span>
              <time dateTime={current.createdAt}>{date(current.createdAt)}</time>
            </div>
            <h2>{current.event.name}</h2>
            <h3>{current.highlight}</h3>
            <p>{current.conversation}</p>
            {current.originalConversation !== current.conversation && (
              <details className="original-note">
                <summary>Our first note</summary>
                <p>{current.originalConversation}</p>
              </details>
            )}
            <div className="memory-footer">
              <span>
                {recruiter ? person.name.split(' ')[0] : 'You'} shared this
                {current.updatedAt !== current.createdAt
                  ? ` · edited ${date(current.updatedAt)}`
                  : ''}
              </span>
              {!recruiter && (
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link to={`/connect/${current.eventId}`} />}
                  nativeButton={false}
                >
                  <Pencil />
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className="conversation-heading">
            <h2>Conversation</h2>
            <span>Just the two of you</span>
          </div>
          <div className="message-list" aria-live="polite" aria-relevant="additions">
            {!messages && !error && <Loading text="Opening conversation…" />}
            {messages?.length === 100 && (
              <p className="mb-4 text-center text-xs text-muted-foreground">
                Showing the latest 100 messages
              </p>
            )}
            {messages?.length === 0 && <Empty title="Pick up where you left off" />}
            {messages?.map((message) => {
              const own = message.senderId === user.id;
              return (
                <div className={`message ${own ? 'own' : ''}`} key={message.id}>
                  {!own && <Avatar name={person.name} size="small" />}
                  <div>
                    <div className="message-bubble">{message.text}</div>
                    <time dateTime={message.createdAt}>
                      {date(message.createdAt)} ·{' '}
                      {new Date(message.createdAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                </div>
              );
            })}
            <div ref={end} />
          </div>
          <ErrorMessage message={error} />
          <form
            className="message-composer"
            onSubmit={async (e) => {
              e.preventDefault();
              if (sendingRequest.current || !text.trim()) return;
              const destination = thread;
              let sent = false;
              sendingRequest.current = true;
              requestVersion.current++;
              setSending(true);
              setError('');
              try {
                const { message } = await api<{ message: Message }>(
                  `/connections/${destination}/messages`,
                  { method: 'POST', body: json({ text }) },
                );
                if (activeThread.current !== destination) return;
                requestVersion.current++;
                setMessages((old) =>
                  [...(old || []).filter((m) => m.id !== message.id), message].slice(-100),
                );
                setText('');
                requestAnimationFrame(() =>
                  end.current?.scrollIntoView({
                    block: 'nearest',
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                      ? 'auto'
                      : 'smooth',
                  }),
                );
              } catch (e) {
                if (activeThread.current === destination) setError((e as Error).message);
              } finally {
                if (activeThread.current === destination) {
                  sendingRequest.current = false;
                  setSending(false);
                  if (sent) void loadMessages();
                }
              }
            }}
          >
            <Textarea
              disabled={sending}
              aria-label={`Message ${person.name}`}
              placeholder={`Message ${person.name.split(' ')[0]}…`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={3000}
              rows={3}
              required
            />
            <div>
              <Button type="submit" disabled={sending || !text.trim()}>
                {sending ? 'Sending…' : 'Send'}
                <Send size={14} />
              </Button>
            </div>
          </form>
        </section>
      </div>
      {material && <MaterialPreview material={material} onClose={() => setMaterial(null)} />}
      {remove && (
        <Modal
          title={`Disconnect from ${person.name.split(' ')[0]}?`}
          onClose={() => setRemove(false)}
        >
          <p className="text-sm text-muted-foreground">
            Your conversations together will be removed, and you’ll no longer see each other’s
            updates or shared work.
          </p>
          <div className="form-actions">
            <Button variant="outline" onClick={() => setRemove(false)}>
              Stay connected
            </Button>
            <Button
              variant="destructive"
              disabled={removing}
              onClick={async () => {
                setRemoving(true);
                try {
                  for (const encounter of encounters)
                    await api(`/connections/${encounter.id}`, { method: 'DELETE' });
                  onChange();
                  onClose();
                  toast.success('Disconnected');
                } catch (e) {
                  toast.error((e as Error).message);
                  onChange();
                } finally {
                  setRemoving(false);
                }
              }}
            >
              Disconnect
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function RoleContext({
  connection,
  roles,
  onNewRole,
}: {
  connection: Connection;
  roles: Role[];
  onNewRole: () => void;
}) {
  const [roleId, setRoleId] = useState(roles[0]?.id || '');
  const [result, setResult] = useState<{ brief: Brief; sources: Source[] } | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setResult(null);
    setError('');
    if (!roleId) return;
    setBusy(true);
    api<NonNullable<typeof result>>(`/workspace/connections/${connection.id}/brief`, {
      method: 'POST',
      body: json({ roleId }),
    })
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [
    roleId,
    connection.id,
    connection.updatedAt,
    connection.candidate.updatedAt,
    connection.materials,
  ]);
  return (
    <div className="role-body">
      {roles.length > 0 && (
        <Choice
          label="Choose a role"
          value={roleId}
          onChange={setRoleId}
          options={roles.map((r) => ({ value: r.id, label: r.title }))}
          className="w-full"
        />
      )}
      <Button variant="ghost" size="sm" onClick={onNewRole}>
        <Plus />
        Add a role
      </Button>
      {busy && <Loading text="Finding relevant work…" />}
      <ErrorMessage message={error} />
      {result && (
        <div className="role-passages">
          {result.brief.mode === 'ai' && result.brief.summary && <p>{result.brief.summary}</p>}
          {result.brief.findings.map((finding, i) => {
            const s = result.sources.find((s) => s.id === finding.sourceId);
            return (
              <div key={i}>
                <h3>{finding.requirement}</h3>
                {finding.quote && s ? (
                  <>
                    <blockquote>{finding.quote}</blockquote>
                    <button onClick={() => setSource(s)}>
                      {s.title}
                      <ArrowUpRight size={12} />
                    </button>
                  </>
                ) : (
                  <p>Couldn’t find a matching passage.</p>
                )}
              </div>
            );
          })}
          <p className="matching-note">From their own words. Matches aren’t a skills assessment.</p>
          {result.brief.fallback && <p className="matching-note">{result.brief.notice}</p>}
        </div>
      )}
      {source && (
        <Modal title={source.title} onClose={() => setSource(null)} wide>
          <div className="source-text">{source.text}</div>
        </Modal>
      )}
    </div>
  );
}
