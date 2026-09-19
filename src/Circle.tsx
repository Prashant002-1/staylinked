import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarPlus,
  Download,
  LogOut,
  Plus,
  QrCode,
  Search,
  UserRound,
  Users,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { api, date, json } from './api';
import { useAuth } from './session';
import { Avatar, Brand, Empty, ErrorMessage, Loading } from './ui';
import { Profile } from './Profile';
import Updates from './Updates';
import ConnectionPanel from './ConnectionPanel';
import { ShareQR, NewEvent, NewRole } from './RecruiterModals';
import type { Connection, Workspace } from './types';

export default function Circle() {
  const { user, setUser, logout, demoMode, demo } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'qr' | 'event' | 'role' | null>(null);
  const [sharingEvent, setSharingEvent] = useState('');
  const [busy, setBusy] = useState(false);
  const recruiter = user?.kind === 'recruiter';
  const view = params.get('view') || 'people';
  const personId = params.get('person');
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [view, personId]);
  const requestVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const result = await api<Workspace>(recruiter ? '/workspace' : '/candidate');
      if (version !== requestVersion.current) return;
      setData({
        connections: result.connections,
        events: result.events || [],
        roles: result.roles || [],
      });
      setError('');
    } catch (e) {
      if (version === requestVersion.current) setError((e as Error).message);
    }
  }, [recruiter, user?.id]);
  useEffect(() => {
    setData(null);
    setError('');
    void refresh();
    window.addEventListener('focus', refresh);
    return () => {
      requestVersion.current++;
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);
  if (!user) return null;
  const selectView = (next: string) => setParams(next === 'people' ? {} : { view: next });
  const openPerson = (connection: Connection) => setParams({ view, person: connection.id });
  const person = data?.connections.find((c) => c.id === personId);
  // Keep one card per person, but retain every encounter for search and conversation.
  const byPerson = new Map<string, Connection[]>();
  const newestFirst = [...(data?.connections || [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  for (const connection of newestFirst) {
    const id = recruiter ? connection.candidateId : connection.recruiterId;
    const encounters = byPerson.get(id) || [];
    encounters.push(connection);
    byPerson.set(id, encounters);
  }
  const people = [...byPerson.values()];
  const query = search.toLowerCase().trim();
  const shown = people
    .filter((encounters) =>
      encounters.some((c) => {
        const p = recruiter ? c.candidate : c.recruiter!;
        return [p.name, p.headline, c.highlight, c.conversation, c.event.name, ...(p.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(query);
      }),
    )
    .map(([newest]) => newest);
  const exportPeople = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/workspace/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json({ ids: data?.connections.map((c) => c.id) || [] }),
      });
      if (!response.ok) throw new Error('Could not export your connections.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'staylinked-connections.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="social-app">
      <header className="social-header">
        <div className="social-header-inner">
          <Brand />
          <nav className="social-nav" aria-label="Main navigation">
            {(['people', 'updates', 'profile'] as const).map((item) => (
              <button
                key={item}
                className={view === item ? 'active' : ''}
                aria-current={view === item ? 'page' : undefined}
                onClick={() => selectView(item)}
              >
                {item === 'people' ? 'People' : item === 'updates' ? 'Updates' : 'Your profile'}
              </button>
            ))}
          </nav>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="account-button" aria-label="Account menu" />
              }
            >
              <Avatar name={user.name} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <div className="px-3 py-2 text-sm font-medium">{user.name}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => selectView('profile')}>
                <UserRound />
                Edit your profile
              </DropdownMenuItem>
              {recruiter && (
                <>
                  <DropdownMenuItem onClick={() => setModal('event')}>
                    <CalendarPlus />
                    Add an event
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setModal('role')}>
                    <Plus />
                    Add a role
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!data?.connections.length || busy}
                    onClick={() => void exportPeople()}
                  >
                    <Download />
                    Export connections
                  </DropdownMenuItem>
                </>
              )}
              {demoMode && (
                <DropdownMenuItem
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const next = await demo(recruiter ? 'candidate' : 'recruiter');
                      navigate(next.kind === 'recruiter' ? '/workspace' : '/profile');
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Users />
                  {recruiter ? 'Switch to applicant' : 'Switch to recruiter'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await logout();
                    navigate('/');
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className={`social-main ${view === 'updates' && !personId ? 'feed-width' : ''}`}>
        <ErrorMessage message={error} />
        {error && (
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCw />
            Try again
          </Button>
        )}
        {!data && !error && <Loading />}
        {data &&
          personId &&
          (person ? (
            <ConnectionPanel
              key={`${user.id}:${person.id}`}
              connection={person}
              connections={data.connections}
              user={user}
              roles={data.roles}
              onClose={() => selectView(view)}
              onChange={() => void refresh()}
              onNewRole={() => setModal('role')}
            />
          ) : (
            <Empty title="This connection is no longer available">
              <button onClick={() => selectView('people')}>Back to people</button>
            </Empty>
          ))}
        {data && !personId && view === 'profile' && (
          <Profile key={user.id} user={user} onUpdate={setUser} />
        )}
        {data && !personId && view === 'updates' && (
          <Updates key={user.id} user={user} connections={data.connections} onPerson={openPerson} />
        )}
        {data && !personId && !['profile', 'updates'].includes(view) && (
          <>
            <div className="social-page-heading">
              <div>
                <span className="eyebrow">YOUR CIRCLE</span>
                <h1>People</h1>
              </div>
              {recruiter && (
                <Button
                  className="share-button"
                  onClick={() => {
                    setSharingEvent('');
                    setModal(data.events.length ? 'qr' : 'event');
                  }}
                >
                  <QrCode />
                  Connect in person
                </Button>
              )}
            </div>
            <div className="people-toolbar">
              <label className="people-search">
                <Search size={17} />
                <Input
                  aria-label="Search your connections"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="A name, a project, a conversation…"
                />
              </label>
              <span>
                {people.length} {people.length === 1 ? 'connection' : 'connections'}
              </span>
            </div>
            <div className="people-grid">
              {shown.map((c) => {
                const p = recruiter ? c.candidate : c.recruiter!;
                return (
                  <button
                    className="person-card"
                    key={c.id}
                    onClick={() => openPerson(c)}
                    aria-label={`Open ${p.name}`}
                  >
                    <div className="card-portrait">
                      <Avatar name={p.name} size="large" />
                      <ArrowUpRight size={18} />
                    </div>
                    <h2>{p.name}</h2>
                    <p className="person-headline">{p.headline}</p>
                    <div className="card-memory">
                      <span>We talked about</span>
                      <p>{c.highlight}</p>
                    </div>
                    <div className="card-meeting">
                      <span>{c.event.name}</span>
                      <time dateTime={c.createdAt}>{date(c.createdAt)}</time>
                    </div>
                  </button>
                );
              })}
            </div>
            {!shown.length && (
              <Empty title={search ? 'No one found' : 'Your next conversation starts here'}>
                {search
                  ? 'Try a name or something you talked about.'
                  : recruiter
                    ? 'Share your code when you meet someone.'
                    : 'Scan a recruiter’s code when you meet.'}
              </Empty>
            )}
          </>
        )}
      </main>
      {modal === 'qr' && data && (
        <ShareQR events={data.events} initialEvent={sharingEvent} onClose={() => setModal(null)} />
      )}
      {modal === 'event' && (
        <NewEvent
          onClose={() => setModal(null)}
          onCreate={(event) => {
            setData((d) => (d ? { ...d, events: [...d.events, event] } : d));
            setSharingEvent(event.id);
            setModal('qr');
            toast.success('Event added');
          }}
        />
      )}
      {modal === 'role' && (
        <NewRole
          onClose={() => setModal(null)}
          onCreate={(role) => {
            setData((d) => (d ? { ...d, roles: [...d.roles, role] } : d));
            setModal(null);
            toast.success('Role added');
          }}
        />
      )}
    </div>
  );
}
