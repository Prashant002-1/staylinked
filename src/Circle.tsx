import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Download,
  LogOut,
  QrCode,
  UserRound,
  Users,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { api, date, json } from './api';
import { useFileDownload } from './downloads';
import { useAuth } from './session';
import { Avatar, Brand, Empty, ErrorMessage, Loading, Modal } from './ui';
import { Profile } from './Profile';
import ConnectionPanel from './ConnectionPanel';
import { ShareQR, NewEvent, NewRole } from './RecruiterModals';
import type { Connection, Role, Workspace } from './types';
const ScanQR = lazy(() => import('./ScanQR'));

export default function Circle() {
  const { user, setUser, logout, demoMode, demo } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'qr' | 'scan' | 'event' | 'role' | null>(null);
  const [sharingEvent, setSharingEvent] = useState('');
  const [busy, setBusy] = useState(false);
  const [roleId, setRoleId] = useState('');
  const [roleOpen, setRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>();
  const [eventFilter, setEventFilter] = useState('all');
  const fileDownload = useFileDownload();
  const recruiter = user?.kind === 'recruiter';
  const ownProfile = params.get('view') === 'profile';
  const personId = params.get('person');
  const requestVersion = useRef(0);
  const refreshRequest = useRef<AbortController | null>(null);
  const previousPerson = useRef(personId);
  const listScroll = useRef(0);
  const returnFocus = useRef('');
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const main = useRef<HTMLElement>(null);
  const account = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    window.scrollTo({
      top: ownProfile || personId ? 0 : listScroll.current,
      left: 0,
      behavior: 'instant',
    });
    if (!data) return;
    const frame = requestAnimationFrame(() => {
      const heading = main.current?.querySelector<HTMLElement>('h1');
      if (ownProfile || personId) {
        heading?.setAttribute('tabindex', '-1');
        heading?.focus({ preventScroll: true });
      } else if (returnFocus.current) {
        const target =
          returnFocus.current === 'account'
            ? account.current
            : rows.current.get(returnFocus.current);
        target?.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [ownProfile, personId, Boolean(data)]);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    refreshRequest.current?.abort();
    const controller = new AbortController();
    refreshRequest.current = controller;
    try {
      const result = await api<Workspace>(recruiter ? '/workspace' : '/candidate', {
        signal: controller.signal,
      });
      if (controller.signal.aborted || version !== requestVersion.current) return;
      setData({
        connections: result.connections,
        events: result.events || [],
        roles: result.roles || [],
      });
      setError('');
    } catch (e) {
      if (!controller.signal.aborted && version === requestVersion.current)
        setError((e as Error).message);
    } finally {
      if (refreshRequest.current === controller) refreshRequest.current = null;
    }
  }, [recruiter, user?.id]);
  useEffect(() => {
    setData(null);
    void refresh();
    window.addEventListener('focus', refresh);
    return () => {
      requestVersion.current++;
      refreshRequest.current?.abort();
      refreshRequest.current = null;
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);
  useEffect(() => {
    const returnedToConnections =
      previousPerson.current !== null && personId === null && !ownProfile;
    previousPerson.current = personId;
    if (returnedToConnections) void refresh();
  }, [personId, ownProfile, refresh]);
  if (!user) return null;
  const home = () => setParams({});
  const person = data?.connections.find((c) => c.id === personId);
  const selectedEvent = data?.events.find((event) => event.id === eventFilter);
  const visibleConnections = (data?.connections || []).filter(
    (connection) => !selectedEvent || connection.eventId === selectedEvent.id,
  );
  const byPerson = new Map<string, Connection>();
  for (const c of [...visibleConnections].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const id = recruiter ? c.candidateId : c.recruiterId;
    if (!byPerson.has(id)) byPerson.set(id, c);
  }
  const people = [...byPerson.values()];
  const exportPeople = () =>
    fileDownload.download('/workspace/export', 'staylinked-connections.csv', {
      method: 'POST',
      body: json({ ids: visibleConnections.map((connection) => connection.id) }),
    });
  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                ref={account}
                variant="ghost"
                className="account-button"
                aria-label="Your account"
              />
            }
          >
            <Avatar name={user.name} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <div className="px-3 py-2 text-sm font-medium">{user.name}</div>
            <DropdownMenuItem
              onClick={() => {
                if (!personId && !ownProfile) listScroll.current = window.scrollY;
                returnFocus.current = 'account';
                setParams({ view: 'profile' });
              }}
            >
              <UserRound />
              Your profile
            </DropdownMenuItem>
            {recruiter && (
              <DropdownMenuItem
                disabled={!visibleConnections.length || busy || fileDownload.busy}
                onClick={() => void exportPeople()}
              >
                <Download />
                {fileDownload.busy
                  ? 'Exporting…'
                  : selectedEvent
                    ? 'Export event connections'
                    : 'Export connections'}
              </DropdownMenuItem>
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
      </header>
      <main ref={main} className={`app-main ${personId || ownProfile ? 'profile-width' : ''}`}>
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
              roleId={roleId || data.roles[0]?.id || ''}
              onRoleChange={setRoleId}
              roleOpen={roleOpen}
              onRoleOpenChange={setRoleOpen}
              onClose={home}
              onChange={() => void refresh()}
              onNewRole={() => {
                setEditingRole(undefined);
                setModal('role');
              }}
              onEditRole={(role) => {
                setEditingRole(role);
                setModal('role');
              }}
            />
          ) : (
            <Empty title="This connection is no longer available">
              <button onClick={home}>Back to connections</button>
            </Empty>
          ))}
        {data && !personId && ownProfile && (
          <>
            <Button className="back-link" variant="ghost" onClick={home}>
              <ArrowLeft />
              Connections
            </Button>
            <Profile key={user.id} user={user} onUpdate={setUser} />
          </>
        )}
        {data && !personId && !ownProfile && (
          <>
            <div className="page-heading">
              <div>
                <h1>
                  Connections <span>{people.length}</span>
                </h1>
                {recruiter && data.events.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          className="event-filter"
                          aria-label="Filter connections by event"
                        />
                      }
                    >
                      {selectedEvent?.name || 'All events'}
                      <ChevronDown size={14} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuRadioGroup
                        value={selectedEvent?.id || 'all'}
                        onValueChange={(value) => {
                          setEventFilter(value);
                          listScroll.current = 0;
                          if (value !== 'all') setSharingEvent(value);
                        }}
                      >
                        <DropdownMenuRadioItem value="all" closeOnClick>
                          All events
                        </DropdownMenuRadioItem>
                        {data.events.map((event) => (
                          <DropdownMenuRadioItem key={event.id} value={event.id} closeOnClick>
                            {event.name}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <Button
                onClick={() => {
                  setModal(recruiter ? (data.events.length ? 'qr' : 'event') : 'scan');
                }}
              >
                <QrCode />
                {recruiter ? 'Share my code' : 'Scan a code'}
              </Button>
            </div>
            <div className="connection-list">
              {people.map((c) => {
                const p = recruiter ? c.candidate : c.recruiter!;
                return (
                  <button
                    className="connection-row"
                    key={c.id}
                    ref={(node) => {
                      if (node) rows.current.set(c.id, node);
                      else rows.current.delete(c.id);
                    }}
                    onClick={() => {
                      listScroll.current = window.scrollY;
                      returnFocus.current = c.id;
                      setParams({ person: c.id });
                    }}
                    aria-label={`View ${p.name}`}
                  >
                    <Avatar name={p.name} size="large" />
                    <div className="connection-identity">
                      <h2>{p.name}</h2>
                      <p>{p.headline}</p>
                      <span>
                        {c.event.name} · {date(c.createdAt)}
                      </span>
                    </div>
                    <p className="connection-memory">{c.highlight}</p>
                    <ChevronRight className="connection-arrow" size={16} />
                  </button>
                );
              })}
            </div>
            {people.length === 0 && (
              <Empty
                title={selectedEvent ? 'No connections from this event yet' : 'No connections yet'}
              >
                {recruiter
                  ? 'Share your QR code when you meet someone.'
                  : 'Scan a recruiter’s QR code to keep the connection.'}
              </Empty>
            )}
          </>
        )}
      </main>
      {modal === 'qr' && data && (
        <ShareQR
          events={data.events}
          initialEvent={sharingEvent}
          onClose={() => {
            setModal(null);
            if (recruiter) void refresh();
          }}
          onNewEvent={() => setModal('event')}
          onEventChange={setSharingEvent}
        />
      )}
      {modal === 'scan' && (
        <Suspense
          fallback={
            <Modal title="Scan a code" onClose={() => setModal(null)}>
              <Loading text="Opening scanner…" />
            </Modal>
          }
        >
          <ScanQR onClose={() => setModal(null)} />
        </Suspense>
      )}
      {modal === 'event' && (
        <NewEvent
          onClose={() => setModal(data?.events.length ? 'qr' : null)}
          onCreate={(event) => {
            setData((d) => (d ? { ...d, events: [...d.events, event] } : d));
            setSharingEvent(event.id);
            setEventFilter(event.id);
            setModal('qr');
          }}
        />
      )}
      {modal === 'role' && (
        <NewRole
          role={editingRole}
          onClose={() => setModal(null)}
          onCreate={(role) => {
            setData((d) =>
              d
                ? {
                    ...d,
                    roles: d.roles.some((current) => current.id === role.id)
                      ? d.roles.map((current) => (current.id === role.id ? role : current))
                      : [...d.roles, role],
                  }
                : d,
            );
            setRoleId(role.id);
            setModal(null);
            toast.success(editingRole ? 'Role updated' : 'Role added');
          }}
        />
      )}
    </div>
  );
}
