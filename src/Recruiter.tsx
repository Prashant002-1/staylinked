import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  LogOut,
  Menu,
  MoreHorizontal,
  Plug,
  Plus,
  QrCode,
  Search,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { api, date, json } from './api';
import { useAuth } from './session';
import { Avatar, Brand, Choice, Empty, ErrorMessage, Loading, Status, stages } from './ui';
import { NewEvent, NewRole, ShareQR } from './RecruiterModals';
import ConnectionPanel, { type WorkflowChange } from './ConnectionPanel';
import Integrations from './Integrations';
import type { Connection, Workspace } from './types';
const navigation = [
  { id: 'connections', label: 'Connections', icon: Users },
  { id: 'follow-up', label: 'Follow-up', icon: Clock3 },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'roles', label: 'Roles', icon: BriefcaseBusiness },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'integrations', label: 'Integrations', icon: Plug },
];
const stageOf = (c: Connection) => c.stage || (c.remembered ? 'reviewed' : 'new');
const changed = (c: Connection) =>
  Math.max(
    Date.parse(c.candidate.updatedAt || c.createdAt),
    ...c.materials.map((m) => Date.parse(m.createdAt)),
    Date.parse(c.updatedAt),
  ) >
  Date.parse(c.createdAt) + 60000;
export default function Recruiter() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('connections');
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [listTab, setListTab] = useState('all');
  const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<'role' | 'event' | 'qr' | null>(null);
  const [qrEvent, setQrEvent] = useState<string>();
  const load = useCallback(async () => {
    try {
      setData(await api<Workspace>('/workspace'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => {
      void load();
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [load]);
  useEffect(() => {
    setSelected(new Set());
  }, [query, eventFilter, statusFilter, roleFilter, listTab, view]);
  const openView = (id: string) => {
    setView(id);
    setMobileNav(false);
    setActiveId(null);
    setQuery('');
    setListTab('all');
    setEventFilter('all');
    setRoleFilter('all');
    setStatusFilter('all');
  };
  const connections = data?.connections || [];
  const filtered = useMemo(
    () =>
      connections
        .filter((c) => {
          if (view === 'follow-up' && stageOf(c) !== 'follow-up') return false;
          if (view === 'saved' && !c.saved) return false;
          if (eventFilter !== 'all' && c.eventId !== eventFilter) return false;
          if (statusFilter !== 'all' && stageOf(c) !== statusFilter) return false;
          if (roleFilter !== 'all' && !c.shortlistedRoles?.includes(roleFilter)) return false;
          if (listTab === 'new' && stageOf(c) !== 'new') return false;
          if (listTab === 'updated' && !changed(c)) return false;
          const text = [
            c.candidate.name,
            c.candidate.email,
            c.candidate.headline,
            c.candidate.bio,
            c.highlight,
            c.conversation,
            c.interest,
            ...(c.candidate.tags || []),
            ...c.materials.map((m) => `${m.title} ${m.text}`),
          ]
            .join(' ')
            .toLowerCase();
          return query
            .toLowerCase()
            .trim()
            .split(/\s+/)
            .every((word) => text.includes(word));
        })
        .sort((a, b) =>
          sort === 'name'
            ? a.candidate.name.localeCompare(b.candidate.name)
            : Date.parse(b.createdAt) - Date.parse(a.createdAt),
        ),
    [connections, view, eventFilter, statusFilter, roleFilter, listTab, query, sort],
  );
  const update = async (ids: string[], changes: WorkflowChange) => {
    setBusy(true);
    try {
      const result = await api<{ connections: Connection[] }>('/workspace/connections', {
        method: 'PATCH',
        body: json({ ids, changes }),
      });
      const byId = new Map(result.connections.map((c) => [c.id, c]));
      setData((d) => d && { ...d, connections: d.connections.map((c) => byId.get(c.id) || c) });
      setSelected(new Set());
      toast.success(
        changes.shortlist === true
          ? 'Added to shortlist'
          : changes.shortlist === false
            ? 'Removed from shortlist'
            : 'Updated',
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const exportConnections = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      const response = await fetch('/api/workspace/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json({ ids }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Export failed');
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'again-hr-connections.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Exported ${ids.length} connections`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const isPeople = ['connections', 'follow-up', 'saved'].includes(view);
  const selectedRole = data?.roles.find((r) => r.id === roleFilter);
  const active = filtered.find((c) => c.id === activeId);
  const position = filtered.findIndex((c) => c.id === activeId);
  const title = selectedRole
    ? selectedRole.title
    : navigation.find((n) => n.id === view)?.label || 'Connections';
  const showQR = (id?: string) => {
    setQrEvent(id);
    setModal('qr');
  };
  const hasFilters =
    query ||
    eventFilter !== 'all' ||
    statusFilter !== 'all' ||
    roleFilter !== 'all' ||
    listTab !== 'all';
  return (
    <div className="workspace-shell">
      {mobileNav && <div className="mobile-nav-backdrop" onClick={() => setMobileNav(false)} />}
      <aside className={`workspace-sidebar ${mobileNav ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <Brand />
          <Button
            className="mobile-only"
            variant="ghost"
            size="icon"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          >
            <X />
          </Button>
        </div>
        <div className="workspace-identity">
          <span className="company-avatar">{auth.user?.company?.[0] || 'W'}</span>
          <div>
            <strong>{auth.user?.company || 'My workspace'}</strong>
            <span>Recruiting workspace</span>
          </div>
        </div>
        <nav aria-label="Workspace">
          <span className="nav-label">Workspace</span>
          {navigation.map((n, i) => (
            <Button
              key={n.id}
              variant="ghost"
              className={`nav-item ${view === n.id ? 'active' : ''} ${i === 3 ? 'nav-separated' : ''}`}
              onClick={() => openView(n.id)}
              aria-current={view === n.id ? 'page' : undefined}
            >
              <n.icon />
              <span>{n.label}</span>
              {n.id === 'connections' && <small>{connections.length}</small>}
              {n.id === 'follow-up' && connections.some((c) => stageOf(c) === 'follow-up') && (
                <small>{connections.filter((c) => stageOf(c) === 'follow-up').length}</small>
              )}
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {auth.demoMode && (
            <Badge variant="outline" className="demo-badge">
              Demo workspace
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="account-button" />}>
              <Avatar name={auth.user!.name} size="small" />
              <span>{auth.user!.name}</span>
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="min-w-52">
              {auth.demoMode && (
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await auth.demo('candidate');
                      navigate('/profile');
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <UserRound />
                  Candidate demo
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await auth.logout();
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
      </aside>
      <main className="workspace-main">
        <header className="workspace-topbar">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-only"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu />
            </Button>
            <span className="text-muted-foreground company-breadcrumb">
              {auth.user?.company || 'Workspace'}
            </span>
            <ChevronRight className="size-3 text-muted-foreground company-breadcrumb" />
            <span>{navigation.find((n) => n.id === view)?.label}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={!data?.events.length}
            onClick={() => showQR()}
          >
            <QrCode />
            Share QR
          </Button>
        </header>
        <ErrorMessage message={error} />
        {!data ? (
          <Loading />
        ) : isPeople ? (
          <div className="page-content people-page">
            <div className="page-heading">
              <div className="flex items-center gap-3">
                {selectedRole && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Back to all connections"
                    onClick={() => setRoleFilter('all')}
                  >
                    <ArrowLeft />
                  </Button>
                )}
                <h1>{title}</h1>
                <span className="heading-count">{filtered.length}</span>
                {selectedRole && <Badge variant="secondary">Shortlist</Badge>}
              </div>
              <Button
                variant="outline"
                disabled={!filtered.length}
                onClick={() =>
                  void exportConnections(selected.size ? [...selected] : filtered.map((c) => c.id))
                }
              >
                <ArrowDownToLine />
                Export
              </Button>
            </div>
            <div className="list-tabs">
              <Tabs value={listTab} onValueChange={(v) => setListTab(String(v))}>
                <TabsList variant="line" className="gap-5">
                  <TabsTrigger value="all">All connections</TabsTrigger>
                  <TabsTrigger value="new">New</TabsTrigger>
                  <TabsTrigger value="updated">Updated</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="table-controls">
              <div className="search-field">
                <Search className="size-4" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people, conversations, work…"
                  aria-label="Search connections"
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Clear search"
                    onClick={() => setQuery('')}
                  >
                    <X />
                  </Button>
                )}
              </div>
              <Choice
                label="Filter by event"
                value={eventFilter}
                onChange={setEventFilter}
                options={[
                  { value: 'all', label: 'All events' },
                  ...data.events.map((e) => ({ value: e.id, label: e.name })),
                ]}
              />
              <Choice
                label="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[{ value: 'all', label: 'Any status' }, ...stages]}
                className="min-w-32"
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="icon-lg" aria-label="Sort connections" />}
                >
                  <SlidersHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSort('recent')}>
                    Recently met{sort === 'recent' && <Check className="ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSort('name')}>
                    Name, A to Z{sort === 'name' && <Check className="ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {selected.size > 0 && (
              <div className="batch-actions">
                <Checkbox
                  checked
                  aria-label="Clear selection"
                  onCheckedChange={() => setSelected(new Set())}
                />
                <span>{selected.size} selected</span>
                <div className="batch-divider" />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="sm" disabled={busy} />}
                  >
                    Set status
                    <ChevronDown />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {stages.map((s) => (
                      <DropdownMenuItem
                        key={s.value}
                        onClick={() =>
                          void update([...selected], { stage: s.value as Connection['stage'] })
                        }
                      >
                        {s.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="sm" disabled={busy || !data.roles.length} />
                    }
                  >
                    Add to role
                    <ChevronDown />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-64">
                    {data.roles.map((r) => (
                      <DropdownMenuItem
                        key={r.id}
                        onClick={() =>
                          void update([...selected], { roleId: r.id, shortlist: true })
                        }
                      >
                        {r.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void update([...selected], { saved: true })}
                >
                  <Bookmark />
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void exportConnections([...selected])}
                >
                  <Download />
                  Export
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="ml-auto"
                  aria-label="Clear selection"
                  onClick={() => setSelected(new Set())}
                >
                  <X />
                </Button>
              </div>
            )}
            <div className="people-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="check-cell">
                      <Checkbox
                        aria-label="Select all visible connections"
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        indeterminate={selected.size > 0 && selected.size < filtered.length}
                        disabled={!filtered.length}
                        onCheckedChange={(v) =>
                          setSelected(v ? new Set(filtered.map((c) => c.id)) : new Set())
                        }
                      />
                    </TableHead>
                    <TableHead className="person-column">
                      Person {sort === 'name' && <ArrowDown className="inline size-3" />}
                    </TableHead>
                    <TableHead className="conversation-column">Conversation</TableHead>
                    <TableHead className="event-column">Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      className={`person-table-row ${selected.has(c.id) ? 'is-selected' : ''}`}
                      onClick={() => setActiveId(c.id)}
                    >
                      <TableCell className="check-cell" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select ${c.candidate.name}`}
                          checked={selected.has(c.id)}
                          onCheckedChange={(v) =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (v) next.add(c.id);
                              else next.delete(c.id);
                              return next;
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          className="table-person"
                          onClick={() => setActiveId(c.id)}
                        >
                          <Avatar name={c.candidate.name} />
                          <span>
                            <strong>
                              {c.candidate.name}
                              {c.saved && (
                                <Bookmark className="size-3 fill-current text-muted-foreground" />
                              )}
                            </strong>
                            <small>{c.candidate.headline || c.candidate.email}</small>
                          </span>
                        </Button>
                      </TableCell>
                      <TableCell className="conversation-column">
                        <div className="table-conversation">
                          <strong>{c.highlight}</strong>
                          <span>
                            {c.materials.length > 0 && (
                              <>
                                <FileText className="size-3" />
                                {c.materials.length} materials<span className="mx-1">·</span>
                              </>
                            )}
                            {changed(c) ? (
                              <>
                                <span className="update-dot" />
                                New activity
                              </>
                            ) : (
                              c.interest || 'Conversation shared'
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="event-column">
                        <div className="table-event">
                          <span>{c.event.name}</span>
                          <small>{date(c.createdAt)}</small>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Status value={stageOf(c)} />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${c.candidate.name}`}
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setActiveId(c.id)}>
                              <UserRound />
                              Open profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void update([c.id], { saved: !c.saved })}
                            >
                              <Bookmark />
                              {c.saved ? 'Unsave' : 'Save connection'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void update([c.id], { stage: 'follow-up' })}
                            >
                              <Clock3 />
                              Move to follow-up
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => void exportConnections([c.id])}>
                              <Download />
                              Export
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!filtered.length && (
              <Empty title="No connections found">
                {hasFilters ? (
                  <Button
                    variant="link"
                    onClick={() => {
                      setQuery('');
                      setEventFilter('all');
                      setStatusFilter('all');
                      setRoleFilter('all');
                      setListTab('all');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : view === 'follow-up' ? (
                  'Mark a connection for follow-up to add them here.'
                ) : view === 'saved' ? (
                  'Your saved connections will appear here.'
                ) : selectedRole ? (
                  'Select connections and add them to this role.'
                ) : (
                  'Share your event QR to add a connection.'
                )}
              </Empty>
            )}
            <div className="table-footer">
              <span>
                {filtered.length} of {connections.length} connections
              </span>
              <span>
                {selected.size > 0
                  ? `${selected.size} selected`
                  : 'Candidate-shared profiles & work'}
              </span>
            </div>
          </div>
        ) : view === 'roles' ? (
          <div className="page-content">
            <div className="page-heading">
              <div className="flex items-center gap-3">
                <h1>Roles</h1>
                <span className="heading-count">{data.roles.length}</span>
              </div>
              <Button onClick={() => setModal('role')}>
                <Plus />
                Add role
              </Button>
            </div>
            <div className="role-list">
              {data.roles.map((r) => {
                const count = connections.filter((c) => c.shortlistedRoles?.includes(r.id)).length;
                return (
                  <article key={r.id} className="role-row">
                    <span className="role-icon">
                      <BriefcaseBusiness />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3>{r.title}</h3>
                      <p>{r.team || 'No team specified'}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {r.requirements.slice(0, 4).map((s) => (
                          <Badge variant="secondary" className="font-normal" key={s}>
                            {s}
                          </Badge>
                        ))}
                        {r.requirements.length > 4 && (
                          <Badge variant="outline">+{r.requirements.length - 4}</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        openView('connections');
                        setRoleFilter(r.id);
                      }}
                    >
                      {count} shortlisted
                      <ArrowRight />
                    </Button>
                  </article>
                );
              })}
            </div>
            {!data.roles.length && (
              <Empty title="No roles yet">
                <Button variant="link" onClick={() => setModal('role')}>
                  Add a role
                </Button>
              </Empty>
            )}
          </div>
        ) : view === 'events' ? (
          <div className="page-content">
            <div className="page-heading">
              <div className="flex items-center gap-3">
                <h1>Events</h1>
                <span className="heading-count">{data.events.length}</span>
              </div>
              <Button onClick={() => setModal('event')}>
                <Plus />
                Create event
              </Button>
            </div>
            <div className="event-grid">
              {data.events.map((e) => (
                <article className="event-card" key={e.id}>
                  <div className="event-date">
                    <CalendarDays className="size-4" />
                    {date(e.date)}
                  </div>
                  <h3>{e.name}</h3>
                  <p>{e.location || 'In person'}</p>
                  <div className="event-card-bottom">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        openView('connections');
                        setEventFilter(e.id);
                      }}
                    >
                      <Users />
                      {connections.filter((c) => c.eventId === e.id).length} connections
                      <ChevronRight />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => showQR(e.id)}>
                      <QrCode />
                      QR code
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            {!data.events.length && <Empty title="No events yet" />}
          </div>
        ) : (
          <Integrations
            canExport={connections.length > 0}
            onExport={() => void exportConnections(connections.map((c) => c.id))}
          />
        )}
      </main>
      {active && data && (
        <ConnectionPanel
          key={active.id}
          connection={active}
          roles={data.roles}
          initialRole={roleFilter === 'all' ? '' : roleFilter}
          onClose={() => setActiveId(null)}
          onChange={(changes) => void update([active.id], changes)}
          busy={busy}
          position={position}
          total={filtered.length}
          onPrevious={() => setActiveId(filtered[position - 1].id)}
          onNext={() => setActiveId(filtered[position + 1].id)}
        />
      )}
      {modal === 'qr' && data && (
        <ShareQR events={data.events} initialEvent={qrEvent} onClose={() => setModal(null)} />
      )}
      {modal === 'role' && (
        <NewRole
          onClose={() => setModal(null)}
          onCreate={(r) => {
            setData((d) => d && { ...d, roles: [...d.roles, r] });
            setModal(null);
            toast.success('Role added');
          }}
        />
      )}
      {modal === 'event' && (
        <NewEvent
          onClose={() => setModal(null)}
          onCreate={(e) => {
            setData((d) => d && { ...d, events: [...d.events, e] });
            showQR(e.id);
            toast.success('Event created');
          }}
        />
      )}
    </div>
  );
}
