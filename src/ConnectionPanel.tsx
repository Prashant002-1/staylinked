import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Unlink,
  BriefcaseBusiness,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { api, date, json } from './api';
import { Avatar, Choice, ErrorMessage, Loading, Modal } from './ui';
import { MaterialPreview } from './Profile';
import { ContactLinks } from './ContactLinks';
import type { Brief, Connection, Role, Source, User } from './types';

export default function ConnectionPanel({
  connection: c,
  connections,
  user,
  roles,
  roleId,
  roleOpen,
  onRoleOpenChange,
  onRoleChange,
  onClose,
  onChange,
  onNewRole,
  onEditRole,
}: {
  connection: Connection;
  connections: Connection[];
  user: User;
  roles: Role[];
  roleId: string;
  roleOpen: boolean;
  onRoleOpenChange: (open: boolean) => void;
  onRoleChange: (id: string) => void;
  onClose: () => void;
  onChange: () => void;
  onNewRole: () => void;
  onEditRole: (role: Role) => void;
}) {
  const recruiter = user.kind === 'recruiter';
  const person = recruiter ? c.candidate : c.recruiter!;
  const encounters = connections
    .filter((other) => other.candidateId === c.candidateId && other.recruiterId === c.recruiterId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [encounterId, setEncounterId] = useState(c.id);
  const current = encounters.find((e) => e.id === encounterId) || c;
  const [materialId, setMaterialId] = useState<string | null>(null);
  const material = materialId ? c.materials?.find((item) => item.id === materialId) : undefined;
  useEffect(() => {
    if (materialId && !material) setMaterialId(null);
  }, [materialId, material]);
  const [remove, setRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const roleTrigger = useRef<HTMLButtonElement>(null);
  const roleHeading = useRef<HTMLHeadingElement>(null);
  const previousRoleOpen = useRef(roleOpen);
  useLayoutEffect(() => {
    if (roleOpen && !previousRoleOpen.current) roleHeading.current?.focus();
    previousRoleOpen.current = roleOpen;
  }, [roleOpen]);
  return (
    <>
      <div className="profile-topline">
        <Button className="back-link" variant="ghost" onClick={onClose}>
          <ArrowLeft />
          Connections
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
              Remove connection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <header className="profile-heading">
        <Avatar name={person.name} size="large" />
        <div className="profile-heading-copy">
          <h1>{person.name}</h1>
          <p>{person.headline}</p>
          {person.location && <span>{person.location}</span>}
        </div>
        <ContactLinks person={person} />
      </header>
      <div className={`person-reading-layout ${roleOpen ? 'with-role' : ''}`}>
        <div className="profile-content">
          <section className="encounter-content">
            <div className="section-topline">
              <h2>{encounters.length > 1 ? 'Where we met' : `Met at ${current.event.name}`}</h2>
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
            {encounters.length > 1 && (
              <Choice
                label="Meeting"
                value={current.id}
                options={encounters.map((e) => ({
                  value: e.id,
                  label: `${e.event.name} · ${date(e.createdAt)}`,
                }))}
                onChange={setEncounterId}
                className="mb-5"
              />
            )}
            <div className="encounter-date">
              {date(current.createdAt)} · {current.event.location}
            </div>
            <h3>{current.highlight}</h3>
            <p>{current.conversation}</p>
            <div className="encounter-byline">
              {recruiter ? `Shared by ${person.name.split(' ')[0]}` : 'Your note'}
              {current.updatedAt !== current.createdAt
                ? ` · edited ${date(current.updatedAt)}`
                : ''}
            </div>
            {current.originalConversation !== current.conversation && (
              <details className="original-note">
                <summary>Original note</summary>
                <p>{current.originalConversation}</p>
              </details>
            )}
          </section>
          {person.bio && (
            <section className="profile-section">
              <h2>About</h2>
              <p className="profile-bio">{person.bio}</p>
            </section>
          )}
          {recruiter && (
            <section className="profile-section">
              <div className="section-topline">
                <h2>Shared work</h2>
                <Button
                  ref={roleTrigger}
                  variant="ghost"
                  size="sm"
                  aria-expanded={roleOpen}
                  aria-controls={`role-context-${current.id}`}
                  onClick={() => {
                    if (roleOpen) roleHeading.current?.focus();
                    else onRoleOpenChange(true);
                  }}
                >
                  <BriefcaseBusiness />
                  {roleOpen ? 'Role context' : 'View for a role'}
                </Button>
              </div>
              {c.materials.length ? (
                c.materials.map((m) => (
                  <button
                    className="shared-work-row"
                    key={m.id}
                    onClick={() => setMaterialId(m.id)}
                  >
                    <FileText size={20} />
                    <span>
                      <strong>{m.title}</strong>
                      <p>{m.text || 'Open the original file'}</p>
                      <small>{date(m.updatedAt || m.createdAt)}</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))
              ) : (
                <p className="muted">No work shared yet.</p>
              )}
            </section>
          )}
          {current.interest && (
            <section className="profile-section">
              <h2>Interested in</h2>
              <p className="profile-bio">{current.interest}</p>
            </section>
          )}
        </div>
        {recruiter && roleOpen && (
          <aside
            className="role-context-panel"
            id={`role-context-${current.id}`}
            aria-labelledby={`role-context-heading-${current.id}`}
          >
            <div className="section-topline">
              <h2 id={`role-context-heading-${current.id}`} ref={roleHeading} tabIndex={-1}>
                Role context
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close role context"
                onClick={() => {
                  onRoleOpenChange(false);
                  roleTrigger.current?.focus();
                }}
              >
                <X />
              </Button>
            </div>
            <RoleContext
              key={current.id}
              connection={current}
              roles={roles}
              roleId={roleId}
              onRoleChange={onRoleChange}
              onNewRole={onNewRole}
              onEditRole={onEditRole}
            />
          </aside>
        )}
      </div>
      {material && <MaterialPreview material={material} onClose={() => setMaterialId(null)} />}
      {remove && (
        <Modal
          title={`Remove ${person.name.split(' ')[0]}?`}
          busy={removing}
          onClose={() => setRemove(false)}
        >
          <p className="dialog-copy">
            You’ll no longer have access to each other’s profile and shared work. You can reconnect
            by scanning a new code.
          </p>
          <div className="form-actions">
            <Button variant="ghost" disabled={removing} onClick={() => setRemove(false)}>
              Cancel
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
                } catch (e) {
                  toast.error((e as Error).message);
                  onChange();
                } finally {
                  setRemoving(false);
                }
              }}
            >
              {removing ? 'Removing…' : 'Remove connection'}
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
  roleId,
  onRoleChange,
  onNewRole,
  onEditRole,
}: {
  connection: Connection;
  roles: Role[];
  roleId: string;
  onRoleChange: (id: string) => void;
  onNewRole: () => void;
  onEditRole: (role: Role) => void;
}) {
  const [result, setResult] = useState<{ brief: Brief; sources: Source[] } | null>(null);
  const [source, setSource] = useState<{ document: Source; quote: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const quoteRef = useRef<HTMLElement | null>(null);
  const selectedRole = roles.find((role) => role.id === roleId);
  const roleVersion = JSON.stringify(selectedRole);
  const materialVersion = connection.materials
    .map((m) => `${m.id}:${m.updatedAt || m.createdAt}`)
    .join('|');
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setSource(null);
    setError('');
    if (!roleId) {
      setBusy(false);
      return;
    }
    setBusy(true);
    api<NonNullable<typeof result>>(`/workspace/connections/${connection.id}/brief`, {
      method: 'POST',
      body: json({ roleId }),
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => {
      controller.abort();
    };
  }, [
    roleId,
    roleVersion,
    connection.id,
    connection.updatedAt,
    connection.candidate.updatedAt,
    materialVersion,
    attempt,
  ]);
  return (
    <div className="role-body">
      <div className="section-topline">
        {roles.length > 0 && (
          <Choice
            label="Role"
            value={roleId}
            onChange={onRoleChange}
            options={roles.map((r) => ({ value: r.id, label: r.title }))}
            className="min-w-0 flex-1"
          />
        )}
        {selectedRole && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Edit selected role"
            onClick={() => onEditRole(selectedRole)}
          >
            <Pencil />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onNewRole}>
          <Plus />
          Add role
        </Button>
      </div>
      {selectedRole?.description && (
        <details className="role-description">
          <summary>Role details</summary>
          {selectedRole.team && <p className="muted">{selectedRole.team}</p>}
          <p>{selectedRole.description}</p>
        </details>
      )}
      {roles.length === 0 && (
        <p className="dialog-copy mt-4">
          Add a role to find relevant passages in this person’s shared work.
        </p>
      )}
      {busy && <Loading text="Finding relevant work…" />}
      <ErrorMessage message={error} />
      {error && (
        <Button variant="ghost" onClick={() => setAttempt((a) => a + 1)}>
          <RefreshCw />
          Try again
        </Button>
      )}
      {result && (
        <div className="role-passages">
          {result.brief.mode === 'ai' && result.brief.summary && <p>{result.brief.summary}</p>}
          {result.brief.findings.map((f, i) => {
            const s = result.sources.find((s) => s.id === f.sourceId);
            if (!f.quote || !s) return null;
            return (
              <section key={i}>
                <h3>{f.requirement}</h3>
                <blockquote>{f.quote}</blockquote>
                <button
                  className="text-action"
                  onClick={() => setSource({ document: s, quote: f.quote! })}
                >
                  {s.title}
                  <ChevronRight size={14} />
                </button>
              </section>
            );
          })}
          {result.brief.findings.some((f) => !f.quote) && (
            <details
              className="unmatched-topics"
              open={result.brief.findings.every((f) => !f.quote) || undefined}
            >
              <summary>
                No passage found for {result.brief.findings.filter((f) => !f.quote).length}{' '}
                {result.brief.findings.filter((f) => !f.quote).length === 1 ? 'topic' : 'topics'}
              </summary>
              <ul>
                {result.brief.findings
                  .filter((f) => !f.quote)
                  .map((f) => (
                    <li key={f.requirement}>{f.requirement}</li>
                  ))}
              </ul>
            </details>
          )}
          {result.brief.fallback && <p className="muted">{result.brief.notice}</p>}
        </div>
      )}
      {source && (
        <Modal
          title={source.document.title}
          onClose={() => setSource(null)}
          initialFocus={quoteRef}
          wide
        >
          <div className="source-text">
            <SourceText text={source.document.text} quote={source.quote} markRef={quoteRef} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function SourceText({
  text,
  quote,
  markRef,
}: {
  text: string;
  quote: string;
  markRef: RefObject<HTMLElement | null>;
}) {
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      markRef.current?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [text, quote, markRef]);
  const start = text.indexOf(quote);
  if (start < 0) return text;
  return (
    <>
      {text.slice(0, start)}
      <mark ref={markRef} tabIndex={-1}>
        {quote}
      </mark>
      {text.slice(start + quote.length)}
    </>
  );
}
