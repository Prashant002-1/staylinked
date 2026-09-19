import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Link2,
  LogOut,
  Plus,
  ScanLine,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { api, date, json } from './api';
import { useAuth } from './session';
import { Avatar, Brand, Empty, ErrorMessage, Loading, Modal, SubmitButton } from './ui';
import type { Connection, Material, User } from './types';

function ProfileForm({ profile, saved }: { profile: User; saved: (user: User) => void }) {
  const [links, setLinks] = useState(profile.links);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  return (
    <form
      className="form-stack profile-form"
      onChange={() => setSuccess(false)}
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
              tags: String(data.tags || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              links: links.filter((l) => l.url.trim()),
            }),
          });
          saved(user);
          setSuccess(true);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="section-title">
        <div>
          <span className="eyebrow">YOUR REUSABLE INTRODUCTION</span>
          <h2>The person behind the conversation.</h2>
        </div>
      </div>
      <div className="form-row">
        <label>
          Your name
          <input
            name="name"
            defaultValue={profile.name}
            required
            maxLength={180}
            autoComplete="name"
          />
        </label>
        <label>
          Location
          <input
            name="location"
            defaultValue={profile.location}
            maxLength={180}
            placeholder="Brooklyn, NY"
          />
        </label>
      </div>
      <label>
        A little about what you do
        <input
          name="headline"
          defaultValue={profile.headline}
          maxLength={180}
          placeholder="Bioengineering researcher · NYU"
        />
      </label>
      <label>
        Your story
        <textarea
          name="bio"
          defaultValue={profile.bio}
          rows={5}
          maxLength={8000}
          placeholder="What have you worked on? What are you curious about? Write it in your own words."
        />
      </label>
      <label>
        Areas you work in <span className="field-hint">Separate with commas. Up to 10.</span>
        <input
          name="tags"
          defaultValue={profile.tags?.join(', ')}
          placeholder="CRISPR, cell culture, research"
        />
      </label>
      <div className="section-title small">
        <label>Find more of your work</label>
        <button
          type="button"
          className="text-button"
          disabled={links.length >= 10}
          onClick={() => {
            setLinks([...links, { label: '', url: '' }]);
            setSuccess(false);
          }}
        >
          <Plus size={14} />
          Add link
        </button>
      </div>
      {links.map((l, i) => (
        <div className="link-fields" key={i}>
          <input
            aria-label={`Link ${i + 1} label`}
            placeholder="Portfolio, LinkedIn…"
            value={l.label}
            maxLength={80}
            onChange={(e) =>
              setLinks(links.map((v, j) => (j === i ? { ...v, label: e.target.value } : v)))
            }
          />
          <input
            aria-label={`Link ${i + 1} URL`}
            type="url"
            placeholder="https://…"
            value={l.url}
            onChange={(e) =>
              setLinks(links.map((v, j) => (j === i ? { ...v, url: e.target.value } : v)))
            }
          />
          <button
            type="button"
            className="icon-button"
            aria-label={`Remove link ${i + 1}`}
            onClick={() => {
              setLinks(links.filter((_, j) => j !== i));
              setSuccess(false);
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {!links.length && (
        <p className="fine-print">
          <Link2 size={13} /> A portfolio, research page, or LinkedIn profile helps tell the rest.
        </p>
      )}
      <ErrorMessage message={error} />
      <div className="form-footer">
        <SubmitButton busy={busy}>Save profile</SubmitButton>
        {success && (
          <span className="success-text" role="status">
            <Check size={15} />
            Saved for your connections
          </span>
        )}
      </div>
    </form>
  );
}
function NoteModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal title="Give your work a little context." onClose={onClose}>
      <p className="muted">
        A project, an experiment, an experience. Tell the story in your own words.
      </p>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const body = Object.fromEntries(new FormData(e.currentTarget));
          try {
            await api('/materials/note', { method: 'POST', body: json(body) });
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Title
          <input
            name="title"
            required
            maxLength={180}
            placeholder="CRISPR-Cas9 delivery · research overview"
          />
        </label>
        <label>
          What did you do?
          <textarea
            name="text"
            required
            minLength={20}
            maxLength={30000}
            rows={8}
            placeholder="What was the problem? What was your contribution? What did you learn or achieve?"
          />
        </label>
        <p className="fine-print">This will be visible to recruiters you connect with.</p>
        <ErrorMessage message={error} />
        <SubmitButton busy={busy}>Share project note</SubmitButton>
      </form>
    </Modal>
  );
}
export default function Candidate() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<{
    profile: User;
    materials: Material[];
    connections: Connection[];
  } | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState(false);
  const [preview, setPreview] = useState<Material | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: 'materials' | 'connections';
    id: string;
    title: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [tab, setTab] = useState('profile');
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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="candidate-page">
      <header className="candidate-header">
        <Brand />
        <div className="candidate-header-actions">
          {auth.demoMode && (
            <button
              className="text-button demo-switch-top"
              onClick={async () => {
                try {
                  await auth.demo('recruiter');
                  navigate('/workspace');
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <Users size={15} />
              Recruiter demo
              <ArrowUpRight size={13} />
            </button>
          )}
          <Avatar name={auth.user!.name} size="small" />
          <button
            className="icon-button"
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
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <main className="candidate-main">
        <div className="candidate-intro">
          <div>
            <span className="eyebrow">YOUR NEXT CHAPTER STARTS WITH YOU</span>
            <h1>Make yourself memorable.</h1>
            <p>Your work. Your words. A little context that goes a long way.</p>
          </div>
          <span className="candidate-flower" aria-hidden="true">
            ✳
          </span>
        </div>
        <div className="candidate-nav" role="tablist" aria-label="Your space">
          <button
            role="tab"
            aria-selected={tab === 'profile'}
            className={tab === 'profile' ? 'active' : ''}
            onClick={() => setTab('profile')}
          >
            My profile & work
          </button>
          <button
            role="tab"
            aria-selected={tab === 'connections'}
            className={tab === 'connections' ? 'active' : ''}
            onClick={() => setTab('connections')}
          >
            My connections <span>{data?.connections.length || 0}</span>
          </button>
        </div>
        <ErrorMessage message={error} />
        {!data ? (
          <Loading />
        ) : tab === 'profile' ? (
          <div className="candidate-grid">
            <div>
              <section className="paper-card">
                <ProfileForm
                  profile={data.profile}
                  saved={(user) => {
                    auth.setUser(user);
                    setData((d) => d && { ...d, profile: user });
                  }}
                />
              </section>
              <section className="paper-card work-section">
                <div className="section-title">
                  <div>
                    <span className="eyebrow">SHOW THE WORK</span>
                    <h2>A little substance goes a long way.</h2>
                  </div>
                </div>
                <p className="muted">
                  Share a résumé, a paper, or the story of a project. You can keep adding to it
                  after the event.
                </p>
                <div className="upload-actions">
                  <label className={`button secondary ${uploading ? 'disabled' : ''}`}>
                    <Upload size={16} />
                    {uploading ? 'Reading your file…' : 'Upload a file'}
                    <input
                      type="file"
                      accept=".pdf,.txt,.md"
                      className="visually-hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        void upload(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button className="button secondary" onClick={() => setNote(true)}>
                    <Plus size={16} />
                    Write a project note
                  </button>
                </div>
                <p className="fine-print">
                  PDF, TXT, or Markdown · Up to 8 MB each · Up to 20 materials
                </p>
                <div className="candidate-materials">
                  {data.materials.map((m) => (
                    <div className="material-with-action" key={m.id}>
                      <button className="material-row" onClick={() => setPreview(m)}>
                        <span className="file-icon">
                          <FileText size={20} />
                        </span>
                        <span>
                          <strong>{m.title}</strong>
                          <small>
                            {m.type === 'file' ? 'Document' : 'Project note'} · {date(m.createdAt)}
                            {m.extraction && m.extraction !== 'ready'
                              ? ' · Add a note for searchable context'
                              : ''}
                          </small>
                        </span>
                        <ArrowUpRight size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Remove ${m.title}`}
                        onClick={() => {
                          setDeleteError('');
                          setDeleteTarget({ kind: 'materials', id: m.id, title: m.title });
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                {!data.materials.length && (
                  <Empty title="Your work belongs here.">
                    A short, specific project note is a great place to start.
                  </Empty>
                )}
              </section>
            </div>
            <aside className="candidate-aside">
              <section className="context-tip">
                <span className="tip-icon">
                  <ScanLine size={24} />
                </span>
                <h3>
                  A good conversation
                  <br />
                  is already a head start.
                </h3>
                <p>
                  Scan a recruiter’s QR to save what you talked about. Your profile and work stay
                  connected to that moment.
                </p>
                <div className="tip-step">
                  <span>01</span>Meet someone.
                </div>
                <div className="tip-step">
                  <span>02</span>Keep the context.
                </div>
                <div className="tip-step">
                  <span>03</span>Give it somewhere to grow.
                </div>
                {auth.demoMode && (
                  <Link to="/connect/nyu-science-fair" className="text-link">
                    Try the event portal
                    <ArrowRight size={15} />
                  </Link>
                )}
              </section>
              <section className="ownership-note">
                <LeafIcon />
                <h4>Still your story.</h4>
                <p>
                  Only recruiters you connect with can access your profile and materials. Updates
                  are shared with those connections. Remove a connection to revoke their access.
                </p>
                <p>You own the words. You choose what to share.</p>
              </section>
            </aside>
          </div>
        ) : (
          <div className="candidate-connections">
            {data.connections.map((c) => (
              <article className="connection-card" key={c.id}>
                <div className="connection-card-head">
                  <Avatar name={c.recruiter!.name} />
                  <div>
                    <h3>{c.recruiter?.name}</h3>
                    <span>
                      {c.recruiter?.company} · {c.recruiter?.headline || 'Recruiter'}
                    </span>
                  </div>
                  <span className="tag">
                    <Check size={12} />
                    Connection saved
                  </span>
                </div>
                <div className="connection-card-context">
                  <span className="eyebrow">
                    {c.event.name} · {date(c.createdAt)}
                  </span>
                  <h4>{c.highlight}</h4>
                  <p>“{c.conversation}”</p>
                </div>
                <div className="connection-card-actions">
                  <Link className="text-link" to={`/connect/${c.eventId}`}>
                    Update your recap
                    <ArrowRight size={15} />
                  </Link>
                  <button
                    className="text-button muted"
                    onClick={() => {
                      setDeleteError('');
                      setDeleteTarget({
                        kind: 'connections',
                        id: c.id,
                        title: `your connection with ${c.recruiter?.name}`,
                      });
                    }}
                  >
                    Remove connection
                  </button>
                </div>
              </article>
            ))}
            {!data.connections.length && (
              <Empty title="The start of something good.">
                Scan a recruiter’s Again QR after a conversation. Your connections will live here.
              </Empty>
            )}
            <p className="fine-print">
              A saved connection keeps your context together. It is not a job application or a
              promise of a response.
            </p>
          </div>
        )}
      </main>
      <footer className="candidate-footer">
        <Brand />
        <span>Good conversations go somewhere.</span>
      </footer>
      {note && (
        <NoteModal
          onClose={() => setNote(false)}
          onSaved={() => {
            setNote(false);
            void load();
          }}
        />
      )}{' '}
      {preview && (
        <Modal title={preview.title} onClose={() => setPreview(null)} wide>
          <div className="source-text">
            {preview.text ||
              'No text could be extracted. The original file is still available. Add a project note so recruiters can find the context.'}
          </div>
          {preview.type === 'file' && (
            <a className="button secondary" href={`/api/materials/${preview.id}/download`}>
              <FileText size={16} />
              Download original
            </a>
          )}
        </Modal>
      )}
      {deleteTarget && (
        <Modal
          title={`Remove ${deleteTarget.kind === 'materials' ? 'this material' : 'this connection'}?`}
          onClose={() => setDeleteTarget(null)}
        >
          <p className="muted">
            {deleteTarget.kind === 'materials'
              ? `${deleteTarget.title} will no longer be available to your connections.`
              : `Removing ${deleteTarget.title} revokes this connection's access. If you have another connection with the same recruiter, that connection still shares your profile.`}
          </p>
          <ErrorMessage message={deleteError} />
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setDeleteTarget(null)}>
              Keep it
            </button>
            <button
              className="button danger"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                setDeleteError('');
                try {
                  await api(`/${deleteTarget.kind}/${deleteTarget.id}`, { method: 'DELETE' });
                  setDeleteTarget(null);
                  await load();
                } catch (e) {
                  setDeleteError((e as Error).message);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function LeafIcon() {
  return <span className="ownership-icon">↗</span>;
}
