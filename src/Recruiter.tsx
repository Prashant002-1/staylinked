import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  FileText,
  FolderOpen,
  Leaf,
  LogOut,
  Mail,
  MapPin,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { api, date, json } from './api';
import { useAuth } from './session';
import { Avatar, Brand, Empty, ErrorMessage, ExternalLink, Loading, Modal } from './ui';
import { NewEvent, NewRole, ShareQR } from './RecruiterModals';
import type { Brief, Connection, Role, Source, Workspace } from './types';

function CandidateDetail({
  connection: c,
  role,
  update,
  onBack,
}: {
  connection: Connection;
  role?: Role;
  update: (id: string, values: { saved?: boolean; remembered?: boolean }) => Promise<void>;
  onBack: () => void;
}) {
  const [tab, setTab] = useState('context');
  const [brief, setBrief] = useState<{ brief: Brief; sources: Source[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState<Source | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setTab('context');
    setSource(null);
  }, [c.id]);
  useEffect(() => {
    setBrief(null);
    setError('');
    if (!role) return;
    let active = true;
    setLoading(true);
    api<{ brief: Brief; sources: Source[] }>(`/workspace/connections/${c.id}/brief`, {
      method: 'POST',
      body: json({ roleId: role.id }),
    })
      .then((data) => {
        if (active) setBrief(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [c.id, c.updatedAt, c.candidate.updatedAt, c.materials.map((m) => m.id).join(','), role?.id]);
  const change = async (values: { saved?: boolean; remembered?: boolean }) => {
    setBusy(true);
    try {
      await update(c.id, values);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const candidate = c.candidate;
  const newestWork = c.materials
    .filter((m) => Date.parse(m.createdAt) > Date.parse(c.createdAt) + 60000)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return (
    <section className="person-detail" aria-label={`${candidate.name}'s connection`}>
      <button className="text-button mobile-back" onClick={onBack}>
        <ArrowLeft size={17} />
        All people
      </button>
      <div className="person-header">
        <Avatar name={candidate.name} size="large" />
        <div className="person-title">
          <span className="eyebrow">A PERSON, BEFORE AN APPLICATION</span>
          <h2>{candidate.name}</h2>
          <p>{candidate.headline}</p>
          <span className="person-location">
            <MapPin size={13} />
            {candidate.location || 'Location not shared'}
          </span>
        </div>
        <button
          className={`icon-button save-button ${c.saved ? 'is-saved' : ''}`}
          disabled={busy}
          aria-label={c.saved ? `Unsave ${candidate.name}` : `Save ${candidate.name}`}
          title={c.saved ? 'Saved for later' : 'Save for later'}
          onClick={() => change({ saved: !c.saved })}
        >
          <Bookmark size={20} fill={c.saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="person-actions">
        <a
          className="button primary"
          href={`mailto:${encodeURIComponent(candidate.email)}?subject=${encodeURIComponent(`Good to reconnect after ${c.event.name}`)}`}
        >
          <Mail size={16} />
          Email {candidate.name.split(' ')[0]}
          <ArrowUpRight size={15} />
        </a>
        <span className="fine-print">You take the next step.</span>
      </div>
      {newestWork && (
        <button className="fresh-work" onClick={() => setTab('work')}>
          <span className="status-dot" />
          New work added {date(newestWork.createdAt)}
          <span>
            See what changed
            <ArrowRight size={13} />
          </span>
        </button>
      )}
      <div className="detail-tabs" role="tablist" aria-label="Candidate information">
        <button
          role="tab"
          aria-selected={tab === 'context'}
          className={tab === 'context' ? 'active' : ''}
          onClick={() => setTab('context')}
        >
          The connection
        </button>
        <button
          role="tab"
          aria-selected={tab === 'work'}
          className={tab === 'work' ? 'active' : ''}
          onClick={() => setTab('work')}
        >
          Shared work <span>{c.materials.length}</span>
        </button>
      </div>
      <ErrorMessage message={error} />
      {tab === 'context' ? (
        <div className="detail-body" role="tabpanel">
          <article className="conversation-card">
            <div className="section-label">
              <span>
                <span className="tiny-dot" />
                WHERE YOU LEFT OFF
              </span>
              <span>{date(c.createdAt)}</span>
            </div>
            <h3>{c.highlight}</h3>
            <p>“{c.conversation}”</p>
            <div className="conversation-event">
              <CalendarDays size={14} />
              <span>{c.event.name}</span>
            </div>
            {c.interest && (
              <p className="conversation-interest">
                <strong>Interested in</strong> {c.interest}
              </p>
            )}
            <div className="conversation-credit">
              <span>Recap shared by {candidate.name.split(' ')[0]}</span>
              {c.remembered ? (
                <button
                  className="acknowledged"
                  disabled={busy}
                  onClick={() => change({ remembered: false })}
                  title="Undo acknowledgment"
                >
                  <CheckCheck size={14} /> You remember this
                </button>
              ) : (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => change({ remembered: true })}
                >
                  <Check size={14} /> I remember this
                </button>
              )}
            </div>
          </article>
          {c.conversation !== c.originalConversation && (
            <details className="original-context">
              <summary>Recap updated {date(c.updatedAt)} · See original</summary>
              <p>{c.originalConversation}</p>
            </details>
          )}
          {role ? (
            <section className="role-evidence">
              <div className="evidence-heading">
                <div>
                  <span className="eyebrow">THROUGH THE LENS OF</span>
                  <h3>{role.title}</h3>
                </div>
                <span className="subtle-icon">
                  <Leaf size={20} />
                </span>
              </div>
              {loading ? (
                <Loading text="Finding the context in their work…" />
              ) : brief ? (
                <>
                  <div className="brief-mode">
                    <span className="tag neutral">
                      {brief.brief.mode === 'ai' ? (
                        <>
                          <Sparkles size={12} />
                          AI-organized brief
                        </>
                      ) : (
                        <>
                          <Search size={12} />
                          Local source matches
                        </>
                      )}
                    </span>
                    <span>
                      {brief.brief.mode === 'ai'
                        ? 'Check the cited work before deciding.'
                        : brief.brief.fallback
                          ? 'Keyword matching while AI is unavailable.'
                          : 'Keyword matching. No AI key connected.'}
                    </span>
                  </div>
                  {brief.brief.notice && (
                    <p className="notice" role="status">
                      {brief.brief.notice}
                    </p>
                  )}
                  {brief.brief.mode === 'ai' && <p className="ai-summary">{brief.brief.summary}</p>}
                  <div className="findings">
                    {brief.brief.findings.map((finding, index) => (
                      <article
                        className={`finding ${finding.sourceId ? '' : 'missing'}`}
                        key={finding.requirement}
                      >
                        <span className="finding-number">{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <h4>{finding.requirement}</h4>
                          {finding.quote ? (
                            <>
                              <p className="evidence-quote">“{finding.quote}”</p>
                              {brief.brief.mode === 'ai' && (
                                <p className="finding-note">{finding.note}</p>
                              )}
                              <button
                                className="source-link"
                                onClick={() =>
                                  setSource(
                                    brief.sources.find((s) => s.id === finding.sourceId) || null,
                                  )
                                }
                              >
                                <FileText size={12} />
                                {brief.sources.find((s) => s.id === finding.sourceId)?.title}
                                <ArrowUpRight size={12} />
                              </button>
                            </>
                          ) : (
                            <p className="finding-note">{finding.note}</p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  <p className="evidence-foot">
                    <FolderOpen size={14} />
                    Candidate-provided material. Relevance is a starting point for your
                    conversation.
                  </p>
                </>
              ) : null}
            </section>
          ) : (
            <div className="no-role">
              <BriefcaseBusiness size={22} />
              <h3>Have a role in mind?</h3>
              <p>
                Select or add one above to see the parts of this person's work that relate to it.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="detail-body" role="tabpanel">
          <section className="about-person">
            <span className="eyebrow">IN THEIR OWN WORDS</span>
            <h3>A little more about {candidate.name.split(' ')[0]}.</h3>
            <p>{candidate.bio || 'No introduction shared yet.'}</p>
            <div className="tags">
              {candidate.tags?.map((t) => (
                <span className="tag" key={t}>
                  {t}
                </span>
              ))}
            </div>
            {candidate.links.length > 0 && (
              <div className="profile-links">
                {candidate.links.map((l) => (
                  <ExternalLink key={l.url} url={l.url}>
                    {l.label || l.url}
                  </ExternalLink>
                ))}
              </div>
            )}
          </section>
          <div className="section-title">
            <h3>Work behind the conversation</h3>
            <span>{c.materials.length} shared</span>
          </div>
          {c.materials.length ? (
            c.materials.map((m) => (
              <button
                className="material-row"
                key={m.id}
                onClick={() =>
                  setSource({
                    id: m.id,
                    title: m.title,
                    text:
                      m.text || 'No text was extracted. Download the original document to read it.',
                    kind: m.type === 'file' ? 'Uploaded document' : 'Candidate note',
                  })
                }
              >
                <span className="file-icon">
                  <FileText size={20} />
                </span>
                <span>
                  <strong>{m.title}</strong>
                  <small>
                    {m.type === 'file' ? 'Document' : 'Project note'} · Shared {date(m.createdAt)}
                  </small>
                </span>
                <ArrowUpRight size={17} />
              </button>
            ))
          ) : (
            <Empty title="More of their story is on the way.">No materials shared yet.</Empty>
          )}
          <p className="fine-print">
            Materials are supplied by the candidate. External links and claims have not been
            independently verified.
          </p>
        </div>
      )}
      {source && (
        <Modal title={source.title} onClose={() => setSource(null)} wide>
          <span className="tag neutral">{source.kind}</span>
          <div className="source-text">{source.text}</div>
          {c.materials.find((m) => m.id === source.id)?.type === 'file' && (
            <a className="button secondary" href={`/api/materials/${source.id}/download`}>
              <FileText size={16} />
              Download original
            </a>
          )}
        </Modal>
      )}
    </section>
  );
}

export default function Recruiter() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [page, setPage] = useState('people');
  const [selected, setSelected] = useState('');
  const [roleId, setRoleId] = useState('');
  const [modal, setModal] = useState('');
  const [qrEvent, setQrEvent] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);
  const load = useCallback(async () => {
    try {
      const value = await api<Workspace>('/workspace');
      setData(value);
      setSelected((s) => s || value.connections[0]?.id || '');
      setRoleId((s) => s || value.roles[0]?.id || '');
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
    const focus = () => {
      void load();
    };
    window.addEventListener('focus', focus);
    const timer = window.setInterval(focus, 30000);
    return () => {
      window.removeEventListener('focus', focus);
      clearInterval(timer);
    };
  }, [load]);
  const filtered = useMemo(
    () =>
      data?.connections.filter(
        (c) =>
          (page !== 'saved' || c.saved) &&
          (eventFilter === 'all' || c.eventId === eventFilter) &&
          `${c.candidate.name} ${c.candidate.headline} ${c.candidate.bio} ${c.conversation} ${c.materials.map((m) => m.text).join(' ')}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ) || [],
    [data, page, eventFilter, search],
  );
  const current = filtered.find((c) => c.id === selected) || filtered[0];
  const role = data?.roles.find((r) => r.id === roleId);
  const update = async (id: string, values: { saved?: boolean; remembered?: boolean }) => {
    const { connection } = await api<{ connection: Connection }>(`/workspace/connections/${id}`, {
      method: 'PATCH',
      body: json(values),
    });
    setData(
      (d) => d && { ...d, connections: d.connections.map((c) => (c.id === id ? connection : c)) },
    );
  };
  const share = (id = '') => {
    setQrEvent(id);
    setModal('qr');
  };
  const go = (target: string) => {
    setPage(target);
    setMobileDetail(false);
  };
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <div className="company-block">
          <span className="company-monogram">{auth.user?.company?.slice(0, 1) || 'A'}</span>
          <div>
            <strong>{auth.user?.company || 'Your workspace'}</strong>
            <small>Recruiter workspace</small>
          </div>
        </div>
        <span className="nav-label">YOUR NETWORK</span>
        <nav>
          <button className={page === 'people' ? 'active' : ''} onClick={() => go('people')}>
            <Users size={18} />
            All people<span>{data?.connections.length || 0}</span>
          </button>
          <button className={page === 'saved' ? 'active' : ''} onClick={() => go('saved')}>
            <Bookmark size={18} />
            Saved for later<span>{data?.connections.filter((c) => c.saved).length || 0}</span>
          </button>
          <button className={page === 'events' ? 'active' : ''} onClick={() => go('events')}>
            <CalendarDays size={18} />
            Events
          </button>
          <button className={page === 'roles' ? 'active' : ''} onClick={() => go('roles')}>
            <BriefcaseBusiness size={18} />
            Your roles
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="mini-flower">✳</span>
            <h3>
              The best next step
              <br />
              starts with a hello.
            </h3>
            <p>Your QR gives a good conversation somewhere to go.</p>
            <button className="text-button" onClick={() => share()} disabled={!data?.events.length}>
              Share your QR <ArrowRight size={15} />
            </button>
          </div>
          {auth.demoMode && (
            <button
              className="demo-switch"
              onClick={async () => {
                try {
                  await auth.demo('candidate');
                  navigate('/profile');
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <span className="status-dot" />
              Demo · View candidate side
              <ArrowUpRight size={13} />
            </button>
          )}
          <div className="account-row">
            <Avatar name={auth.user!.name} size="small" />
            <div>
              <strong>{auth.user?.name}</strong>
              <small>Talent partner</small>
            </div>
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
        </div>
      </aside>
      <main className="workspace-main">
        <header className="workspace-topbar">
          <span>
            <span className="status-dot" />A more human way to hire
          </span>
          <button
            className="button primary"
            onClick={() => share()}
            disabled={!data?.events.length}
          >
            <QrCode size={17} />
            Share your QR
          </button>
        </header>
        <div className="workspace-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                GOOD TO SEE YOU AGAIN, {auth.user?.name.split(' ')[0].toUpperCase()}
              </span>
              <h1>
                {page === 'saved'
                  ? 'Worth keeping close.'
                  : page === 'events'
                    ? 'Where it all starts.'
                    : page === 'roles'
                      ? 'A role opens. Context stays.'
                      : 'Good conversations, kept close.'}
              </h1>
              <p>
                {page === 'saved'
                  ? 'The people you want to come back to.'
                  : page === 'events'
                    ? 'A shared place and a memorable conversation.'
                    : page === 'roles'
                      ? 'Use a role to bring the right parts of a person’s work into focus.'
                      : 'The conversations you started. The potential you saw. All still here.'}
              </p>
            </div>
            <span className="heading-decoration" aria-hidden="true">
              ✳
            </span>
          </div>
          <ErrorMessage message={error} />
          {!data ? (
            <Loading />
          ) : ['people', 'saved'].includes(page) ? (
            <>
              <div className="network-overview">
                <span>
                  <strong>{data.connections.length}</strong> people met
                </span>
                <span>
                  <strong>{data.events.length}</strong> events
                </span>
                <span>
                  <strong>{data.connections.filter((c) => c.saved).length}</strong> saved for later
                </span>
                <button
                  className="text-button refresh-button"
                  disabled={refreshing}
                  onClick={async () => {
                    setRefreshing(true);
                    await load();
                    setRefreshing(false);
                  }}
                >
                  <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
                  {refreshing ? 'Refreshing' : 'Refresh'}
                </button>
              </div>
              <div className="role-bar">
                <span className="role-bar-icon">
                  <BriefcaseBusiness size={18} />
                </span>
                <div>
                  <label htmlFor="role-select">LOOKING FOR SOMEONE?</label>
                  <div className="role-select-wrap">
                    <select
                      id="role-select"
                      value={roleId}
                      onChange={(e) => setRoleId(e.target.value)}
                    >
                      <option value="">Explore without a role</option>
                      {data.roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </div>
                <span className="role-bar-help">
                  See relevant work. Keep the whole person in view.
                </span>
                <button className="button text" onClick={() => setModal('role')}>
                  <Plus size={16} />
                  Add role
                </button>
              </div>
              <div className={`people-grid ${mobileDetail ? 'show-detail' : ''}`}>
                <section className="people-list" aria-label="People you met">
                  <div className="list-tools">
                    <div className="search-field">
                      <Search size={16} />
                      <input
                        aria-label="Search people and work"
                        placeholder="A name, a project, a conversation…"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setMobileDetail(false);
                        }}
                      />
                      {search && (
                        <button
                          className="icon-button"
                          aria-label="Clear search"
                          onClick={() => setSearch('')}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="list-filter">
                      <select
                        aria-label="Filter by event"
                        value={eventFilter}
                        onChange={(e) => setEventFilter(e.target.value)}
                      >
                        <option value="all">All events</option>
                        {data.events.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                      <span>{filtered.length} people</span>
                    </div>
                  </div>
                  <div className="person-list-items">
                    {filtered.map((c, i) => (
                      <button
                        className={`person-row ${current?.id === c.id ? 'selected' : ''}`}
                        key={c.id}
                        onClick={() => {
                          setSelected(c.id);
                          setMobileDetail(true);
                        }}
                        aria-pressed={current?.id === c.id}
                      >
                        <div className="person-row-top">
                          <Avatar name={c.candidate.name} index={i} />
                          <div>
                            <strong>{c.candidate.name}</strong>
                            <span>{c.candidate.headline}</span>
                          </div>
                          {c.saved && (
                            <Bookmark size={14} className="row-bookmark" fill="currentColor" />
                          )}
                        </div>
                        <p>{c.highlight}</p>
                        <div className="person-row-bottom">
                          <span>
                            <span className={`tiny-dot ${c.remembered ? 'green' : ''}`} />
                            {c.remembered ? 'Remembered' : 'Recap received'}
                          </span>
                          <time>{date(c.createdAt)}</time>
                        </div>
                      </button>
                    ))}
                    {!filtered.length && (
                      <Empty
                        title={
                          search ? 'No conversations found.' : 'Your next connection starts here.'
                        }
                      >
                        {search
                          ? 'Try a different name or a detail from their work.'
                          : 'Share your QR after a good conversation. Their recap will appear here.'}
                      </Empty>
                    )}
                  </div>
                  <div className="list-footer">
                    <Leaf size={13} />
                    Good connections grow over time.
                  </div>
                </section>
                {current ? (
                  <CandidateDetail
                    connection={current}
                    role={role}
                    update={update}
                    onBack={() => setMobileDetail(false)}
                  />
                ) : (
                  <section className="person-detail">
                    <Empty title="A familiar face for the next opportunity.">
                      Your connections and the work behind them will appear here.
                    </Empty>
                  </section>
                )}
              </div>
            </>
          ) : page === 'events' ? (
            <>
              <div className="section-title">
                <h2>Your meeting places</h2>
                <button className="button primary" onClick={() => setModal('event')}>
                  <Plus size={16} />
                  New event
                </button>
              </div>
              <div className="event-grid">
                {data.events.map((e) => (
                  <article className="event-card" key={e.id}>
                    <span className="event-date">
                      <CalendarDays size={16} />
                      {date(e.date)}
                    </span>
                    <h3>{e.name}</h3>
                    <p>
                      <MapPin size={14} />
                      {e.location || 'Location not set'}
                    </p>
                    <div className="event-people">
                      <Users size={16} />
                      {data.connections.filter((c) => c.eventId === e.id).length} conversations kept
                    </div>
                    <div className="event-actions">
                      <button className="button secondary" onClick={() => share(e.id)}>
                        <QrCode size={16} />
                        Show QR
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          setEventFilter(e.id);
                          go('people');
                        }}
                      >
                        See people
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="section-title">
                <h2>Your role lenses</h2>
                <button className="button primary" onClick={() => setModal('role')}>
                  <Plus size={16} />
                  Add role
                </button>
              </div>
              <div className="event-grid">
                {data.roles.map((r) => (
                  <article className="event-card" key={r.id}>
                    <span className="event-date">
                      <BriefcaseBusiness size={16} />
                      {r.team || 'Your team'}
                    </span>
                    <h3>{r.title}</h3>
                    <p>{r.description}</p>
                    <div className="tags">
                      {r.requirements.map((item) => (
                        <span className="tag" key={item}>
                          {item}
                        </span>
                      ))}
                    </div>
                    <button
                      className="text-button role-open"
                      onClick={() => {
                        setRoleId(r.id);
                        go('people');
                      }}
                    >
                      Explore your connections
                      <ArrowRight size={16} />
                    </button>
                  </article>
                ))}
              </div>
              {!data.roles.length && (
                <Empty title="The next role starts here.">
                  Add a role to explore the work your connections have shared.
                </Empty>
              )}
            </>
          )}
        </div>
      </main>
      {modal === 'qr' && data && (
        <ShareQR events={data.events} initialEvent={qrEvent} onClose={() => setModal('')} />
      )}{' '}
      {modal === 'role' && (
        <NewRole
          onClose={() => setModal('')}
          onCreate={(role) => {
            setData((d) => d && { ...d, roles: [...d.roles, role] });
            setRoleId(role.id);
            setModal('');
            setPage('people');
          }}
        />
      )}{' '}
      {modal === 'event' && (
        <NewEvent
          onClose={() => setModal('')}
          onCreate={(event) => {
            setData((d) => d && { ...d, events: [...d.events, event] });
            share(event.id);
          }}
        />
      )}
    </div>
  );
}
