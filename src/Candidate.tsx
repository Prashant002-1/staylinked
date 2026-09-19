import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  FileText,
  LogOut,
  Plus,
  Trash2,
  Upload,
  Users,
  X,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { api, date, json } from './api';
import { useAuth } from './session';
import { Avatar, Brand, Empty, ErrorMessage, Field, Loading, Modal, SubmitButton } from './ui';
import { MaterialPreview } from './ConnectionPanel';
import type { User, Material, Connection } from './types';
function ProfileForm({ profile, saved }: { profile: User; saved: (user: User) => void }) {
  const [links, setLinks] = useState(profile.links);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const data = Object.fromEntries(new FormData(e.currentTarget));
        try {
          const { user } = await api<{ user: User }>('/profile', {
            method: 'PUT',
            body: json({
              ...data,
              links: links.filter((l) => l.url.trim()),
              tags: String(data.tags)
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            }),
          });
          saved(user);
          toast.success('Profile saved');
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-row">
        <Field label="Name">
          <Input name="name" defaultValue={profile.name} maxLength={100} required />
        </Field>
        <Field label="Location">
          <Input name="location" defaultValue={profile.location} maxLength={180} />
        </Field>
      </div>
      <Field label="Headline">
        <Input
          name="headline"
          defaultValue={profile.headline}
          maxLength={180}
          placeholder="Researcher · NYU"
        />
      </Field>
      <Field label="About">
        <Textarea name="bio" defaultValue={profile.bio} rows={6} maxLength={8000} />
      </Field>
      <Field label="Skills / areas of work" hint="Separate with commas. Up to 10.">
        <Input
          name="tags"
          defaultValue={profile.tags?.join(', ')}
          placeholder="CRISPR, cell culture, research"
        />
      </Field>
      <div className="section-heading mt-3">
        <h3>Links</h3>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          disabled={links.length >= 10}
          onClick={() => setLinks([...links, { label: '', url: '' }])}
        >
          <Plus />
          Add link
        </Button>
      </div>
      {links.map((l, i) => (
        <div className="link-fields" key={i}>
          <Input
            aria-label={`Link ${i + 1} label`}
            placeholder="Portfolio"
            value={l.label}
            maxLength={80}
            required={!!l.url}
            onChange={(e) =>
              setLinks(links.map((v, j) => (j === i ? { ...v, label: e.target.value } : v)))
            }
          />
          <Input
            aria-label={`Link ${i + 1} URL`}
            type="url"
            placeholder="https://"
            value={l.url}
            onChange={(e) =>
              setLinks(links.map((v, j) => (j === i ? { ...v, url: e.target.value } : v)))
            }
          />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label={`Remove link ${i + 1}`}
            onClick={() => setLinks(links.filter((_, j) => j !== i))}
          >
            <X />
          </Button>
        </div>
      ))}
      <ErrorMessage message={error} />
      <div className="form-actions border-t pt-5">
        <SubmitButton busy={busy}>Save changes</SubmitButton>
      </div>
    </form>
  );
}
function NoteModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal title="Add project note" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const body = Object.fromEntries(new FormData(e.currentTarget));
          try {
            await api('/materials/note', { method: 'POST', body: json(body) });
            onSaved();
            toast.success('Note added');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Title">
          <Input
            name="title"
            required
            maxLength={180}
            placeholder="CRISPR-Cas9 delivery research"
          />
        </Field>
        <Field label="Project / experience">
          <Textarea name="text" required minLength={20} maxLength={30000} rows={8} />
        </Field>
        <p className="text-xs text-muted-foreground">Shared with recruiters you connect with.</p>
        <ErrorMessage message={error} />
        <div className="form-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton busy={busy}>Add note</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
export default function Candidate() {
  const auth = useAuth();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<{
    profile: User;
    materials: Material[];
    connections: Connection[];
  } | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('profile');
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState(false);
  const [preview, setPreview] = useState<Material | null>(null);
  const [removal, setRemoval] = useState<{
    kind: 'materials' | 'connections';
    id: string;
    title: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const load = useCallback(async () => {
    try {
      setData(await api('/candidate'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    try {
      await api('/materials/upload', { method: 'POST', body });
      await load();
      toast.success('File uploaded');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };
  const remove = (target: NonNullable<typeof removal>) => {
    setDeleteError('');
    setRemoval(target);
  };
  return (
    <div className="candidate-page">
      <header className="candidate-header">
        <Brand />
        <div className="flex items-center gap-3">
          {auth.demoMode && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Recruiter demo"
              onClick={async () => {
                try {
                  await auth.demo('recruiter');
                  navigate('/workspace');
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <Users />
              <span className="mobile-hide">Recruiter demo</span>
            </Button>
          )}
          <Avatar name={auth.user!.name} size="small" />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Sign out"
            onClick={async () => {
              try {
                await auth.logout();
                navigate('/');
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <LogOut />
          </Button>
        </div>
      </header>
      <main className="candidate-main">
        <div className="candidate-identity">
          <Avatar name={auth.user!.name} size="large" />
          <div>
            <h1>{auth.user!.name}</h1>
            <p>{auth.user!.headline || auth.user!.email}</p>
          </div>
          {auth.demoMode && (
            <Badge variant="outline" className="ml-auto text-muted-foreground">
              Demo profile
            </Badge>
          )}
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <TabsList variant="line" className="candidate-tabs">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="work">
              Work<span className="count-pill">{data?.materials.length || 0}</span>
            </TabsTrigger>
            <TabsTrigger value="connections">
              Connections<span className="count-pill">{data?.connections.length || 0}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <ErrorMessage message={error} />
        {!data ? (
          <Loading />
        ) : tab === 'profile' ? (
          <div className="settings-layout">
            <aside>
              <h2>Personal information</h2>
              <p>Visible to your connections.</p>
            </aside>
            <ProfileForm
              profile={data.profile}
              saved={(user) => {
                auth.setUser(user);
                setData((d) => d && { ...d, profile: user });
              }}
            />
          </div>
        ) : tab === 'work' ? (
          <section className="candidate-work">
            <div className="page-heading">
              <div>
                <h2>Shared work</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, TXT, Markdown · 8 MB per file
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setNote(true)}>
                  <Plus />
                  Add note
                </Button>
                <Button disabled={uploading} onClick={() => input.current?.click()}>
                  <Upload />
                  {uploading ? 'Uploading…' : 'Upload'}
                </Button>
                <input
                  ref={input}
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="sr-only"
                  aria-label="Upload work"
                  disabled={uploading}
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
            <div className="candidate-material-list">
              {data.materials.map((m) => (
                <div className="candidate-material" key={m.id}>
                  <Button variant="ghost" className="material-row" onClick={() => setPreview(m)}>
                    <span className="file-icon">
                      <FileText />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong>{m.title}</strong>
                      <small>
                        {m.type === 'file' ? 'Document' : 'Project note'} · {date(m.createdAt)}
                        {m.extraction && m.extraction !== 'ready' ? ' · No searchable text' : ''}
                      </small>
                    </span>
                    <ArrowUpRight />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${m.title}`}
                    onClick={() => remove({ kind: 'materials', id: m.id, title: m.title })}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
            {!data.materials.length && (
              <Empty title="No work added">
                <Button variant="link" onClick={() => input.current?.click()}>
                  Upload a file
                </Button>
              </Empty>
            )}
            <p className="sharing-note">Updates are shared with your connections.</p>
          </section>
        ) : (
          <section className="candidate-connections">
            {data.connections.map((c) => (
              <article className="candidate-connection" key={c.id}>
                <div className="flex items-center gap-3">
                  <Avatar name={c.recruiter!.name} />
                  <div className="flex-1">
                    <h3>{c.recruiter?.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {c.recruiter?.company} · {c.recruiter?.headline || 'Recruiter'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove connection with ${c.recruiter?.name}`}
                    onClick={() =>
                      remove({ kind: 'connections', id: c.id, title: c.recruiter!.name })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="encounter mt-5">
                  <div className="encounter-meta">
                    <CalendarDays className="size-3.5" />
                    {c.event.name}
                    <span className="ml-auto">{date(c.createdAt)}</span>
                  </div>
                  <h3>{c.highlight}</h3>
                  <p>{c.conversation}</p>
                </div>
                <div className="flex justify-end mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link to={`/connect/${c.eventId}`} />}
                    nativeButton={false}
                  >
                    Edit recap
                    <ArrowUpRight />
                  </Button>
                </div>
              </article>
            ))}
            {!data.connections.length && (
              <Empty title="No connections yet">Scan a recruiter’s event QR to connect.</Empty>
            )}
            <p className="sharing-note">
              Removing a connection revokes access through that connection.
            </p>
          </section>
        )}
      </main>
      {note && (
        <NoteModal
          onClose={() => setNote(false)}
          onSaved={() => {
            setNote(false);
            void load();
          }}
        />
      )}
      {preview && <MaterialPreview material={preview} onClose={() => setPreview(null)} />}
      {removal && (
        <Modal
          title={removal.kind === 'materials' ? 'Remove material?' : 'Remove connection?'}
          onClose={() => setRemoval(null)}
        >
          <p className="text-sm text-muted-foreground">
            {removal.kind === 'materials'
              ? `${removal.title} will no longer be available to your connections.`
              : `Access through this connection with ${removal.title} will be revoked. Other connections with this recruiter still share your profile.`}
          </p>
          <ErrorMessage message={deleteError} />
          <div className="form-actions">
            <Button variant="outline" onClick={() => setRemoval(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await api(`/${removal.kind}/${removal.id}`, { method: 'DELETE' });
                  setRemoval(null);
                  await load();
                  toast.success('Removed');
                } catch (e) {
                  setDeleteError((e as Error).message);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
