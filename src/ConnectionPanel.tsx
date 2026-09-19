import { useEffect, useState } from 'react';
import {
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Mail,
  MapPin,
  Plus,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { api, date, json } from './api';
import { Avatar, Choice, Empty, ErrorMessage, ExternalLink, Loading, Modal, stages } from './ui';
import type { Brief, Connection, Material, Role, Source } from './types';
export type WorkflowChange = {
  saved?: boolean;
  stage?: Connection['stage'];
  roleId?: string;
  shortlist?: boolean;
};
export function MaterialPreview({
  material,
  onClose,
}: {
  material: Material;
  onClose: () => void;
}) {
  return (
    <Modal title={material.title} onClose={onClose} wide>
      <div className="source-text">
        {material.text || 'No searchable text. Download the original file to view it.'}
      </div>
      {material.type === 'file' && (
        <Button
          variant="outline"
          render={<a href={`/api/materials/${material.id}/download`} />}
          nativeButton={false}
        >
          <FileText />
          Download original
        </Button>
      )}
    </Modal>
  );
}
export default function ConnectionPanel({
  connection: c,
  roles,
  initialRole,
  onClose,
  onChange,
  busy,
  position,
  total,
  onPrevious,
  onNext,
}: {
  connection: Connection;
  roles: Role[];
  initialRole: string;
  onClose: () => void;
  onChange: (changes: WorkflowChange) => void;
  busy: boolean;
  position: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const [tab, setTab] = useState('overview');
  const [roleId, setRoleId] = useState(initialRole || roles[0]?.id || '');
  const [evidence, setEvidence] = useState<{ brief: Brief; sources: Source[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [material, setMaterial] = useState<Material | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  useEffect(() => {
    let active = true;
    setEvidence(null);
    setError('');
    if (!roleId) return;
    setLoading(true);
    api<NonNullable<typeof evidence>>(`/workspace/connections/${c.id}/brief`, {
      method: 'POST',
      body: json({ roleId }),
    })
      .then((data) => {
        if (active) setEvidence(data);
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
  }, [c.id, c.updatedAt, c.candidate.updatedAt, c.materials, roleId]);
  const shortlist = c.shortlistedRoles || [];
  return (
    <Sheet
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="connection-panel data-[side=right]:w-full data-[side=right]:sm:max-w-[570px] gap-0"
      >
        <div className="panel-toolbar">
          <span>Connection</span>
          <div className="flex items-center gap-1">
            <span className="text-xs tabular-nums mr-2">
              {position + 1} of {total}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous connection"
              disabled={position === 0}
              onClick={onPrevious}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next connection"
              disabled={position === total - 1}
              onClick={onNext}
            >
              <ChevronRight />
            </Button>
            <span className="h-4 w-px bg-border mx-1" />
            <Button variant="ghost" size="icon-sm" aria-label="Close connection" onClick={onClose}>
              <X />
            </Button>
          </div>
        </div>
        <div className="panel-scroll">
          <div className="person-heading">
            <Avatar name={c.candidate.name} size="large" />
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-xl font-semibold tracking-tight">
                {c.candidate.name}
              </SheetTitle>
              <p>{c.candidate.headline}</p>
              {c.candidate.location && (
                <span>
                  <MapPin className="size-3" />
                  {c.candidate.location}
                </span>
              )}
            </div>
            <Button
              variant={c.saved ? 'secondary' : 'ghost'}
              size="icon"
              disabled={busy}
              aria-label={c.saved ? 'Unsave connection' : 'Save connection'}
              onClick={() => onChange({ saved: !c.saved })}
            >
              <Bookmark className={c.saved ? 'fill-current' : ''} />
            </Button>
          </div>
          <div className="person-actions">
            <Button
              render={
                <a
                  href={`mailto:${c.candidate.email}?subject=${encodeURIComponent(`Following up from ${c.event.name}`)}`}
                />
              }
              nativeButton={false}
            >
              <Mail />
              Email
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" disabled={busy} />}>
                {shortlist.length ? <Check /> : <Plus />}Shortlist
                {shortlist.length > 0 && <span className="count-pill">{shortlist.length}</span>}
                <ChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-64">
                {roles.length ? (
                  roles.map((r) => (
                    <DropdownMenuItem
                      key={r.id}
                      onClick={() =>
                        onChange({ roleId: r.id, shortlist: !shortlist.includes(r.id) })
                      }
                    >
                      <span className="flex-1">{r.title}</span>
                      {shortlist.includes(r.id) && <Check />}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>Add a role first</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="ml-auto">
              <Choice
                label="Connection status"
                value={c.stage || (c.remembered ? 'reviewed' : 'new')}
                options={stages}
                onChange={(v) => onChange({ stage: v as Connection['stage'] })}
                className="h-8 min-w-30"
              />
            </div>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="person-tabs">
            <TabsList variant="line" className="w-full justify-start border-b px-6 h-11 gap-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="work">
                Work<span className="count-pill">{c.materials.length}</span>
              </TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="panel-section space-y-7">
              <section className="encounter">
                <div className="encounter-meta">
                  <CalendarDays className="size-3.5" />
                  <span>{c.event.name}</span>
                  <span className="ml-auto shrink-0">{date(c.createdAt)}</span>
                </div>
                <h3>{c.highlight}</h3>
                <p>{c.conversation}</p>
                <span className="source-byline">Shared by {c.candidate.name.split(' ')[0]}</span>
              </section>
              {c.interest && (
                <div className="property-row">
                  <span>Interested in</span>
                  <p>{c.interest}</p>
                </div>
              )}
              <section>
                <div className="section-heading">
                  <h3>Role evidence</h3>
                  {evidence && (
                    <Badge variant="secondary" className="font-normal text-[11px]">
                      {evidence.brief.mode === 'ai' ? 'Source summary' : 'Text matches'}
                    </Badge>
                  )}
                </div>
                {roles.length ? (
                  <>
                    <Choice
                      label="Evidence for role"
                      value={roleId}
                      onChange={setRoleId}
                      options={roles.map((r) => ({ value: r.id, label: r.title }))}
                      className="w-full mt-3"
                    />
                    {loading && <Loading text="Loading evidence…" />}
                    <ErrorMessage message={error} />
                    {evidence && (
                      <div className="evidence-list">
                        {evidence.brief.mode === 'ai' && evidence.brief.summary && (
                          <p className="text-sm mb-3 leading-relaxed">{evidence.brief.summary}</p>
                        )}
                        {evidence.brief.findings.map((f, i) => {
                          const s = evidence.sources.find((s) => s.id === f.sourceId);
                          return (
                            <div className="evidence-item" key={`${f.requirement}-${i}`}>
                              <div className="flex items-center gap-2">
                                <span className={`evidence-dot ${f.quote && s ? 'found' : ''}`} />
                                <h4>{f.requirement}</h4>
                              </div>
                              {f.quote && s ? (
                                <>
                                  <blockquote>{f.quote}</blockquote>
                                  <Button
                                    variant="link"
                                    size="xs"
                                    className="h-auto p-0 text-xs"
                                    onClick={() => setSource(s)}
                                  >
                                    <FileText className="size-3" />
                                    {s.title}
                                    <ArrowUpRight className="size-3" />
                                  </Button>
                                </>
                              ) : (
                                <p className="text-xs text-muted-foreground ml-4 mt-1">
                                  No supporting text found
                                </p>
                              )}
                            </div>
                          );
                        })}
                        {evidence.brief.fallback && (
                          <p className="text-xs text-muted-foreground pt-3">
                            {evidence.brief.notice ||
                              'Showing text matches. AI summary unavailable.'}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    Add a role to review relevant work.
                  </p>
                )}
              </section>
              {c.candidate.links.length > 0 && (
                <section>
                  <div className="section-heading">
                    <h3>Links</h3>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3">
                    {c.candidate.links.map((l) => (
                      <ExternalLink key={l.url} url={l.url}>
                        {l.label}
                      </ExternalLink>
                    ))}
                  </div>
                </section>
              )}
            </TabsContent>
            <TabsContent value="work" className="panel-section">
              <h3 className="section-label mb-3">About</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line text-secondary-foreground">
                {c.candidate.bio || 'No bio added.'}
              </p>
              <div className="flex flex-wrap gap-1.5 my-4">
                {c.candidate.tags?.map((t) => (
                  <Badge key={t} variant="secondary" className="font-normal">
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="section-heading mt-7">
                <h3>Shared work</h3>
                <span className="text-xs text-muted-foreground">
                  {c.materials.length} files & notes
                </span>
              </div>
              <div className="material-list">
                {c.materials.map((m) => (
                  <Button
                    variant="ghost"
                    className="material-row"
                    key={m.id}
                    onClick={() => setMaterial(m)}
                  >
                    <span className="file-icon">
                      <FileText />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong>{m.title}</strong>
                      <small>
                        {m.type === 'file' ? 'Document' : 'Project note'} · {date(m.createdAt)}
                      </small>
                    </span>
                    <ArrowUpRight className="text-muted-foreground" />
                  </Button>
                ))}
              </div>
              {!c.materials.length && <Empty title="No work shared yet" />}
            </TabsContent>
            <TabsContent value="activity" className="panel-section">
              <div className="activity-list">
                <div>
                  <span className="activity-dot" />
                  <h4>Met at {c.event.name}</h4>
                  <small>
                    {date(c.createdAt)} · {c.event.location}
                  </small>
                  <p>{c.originalConversation}</p>
                </div>
                {c.updatedAt !== c.createdAt && (
                  <div>
                    <span className="activity-dot" />
                    <h4>Conversation updated</h4>
                    <small>
                      {date(c.updatedAt)} · {c.candidate.name}
                    </small>
                    <p>{c.conversation}</p>
                  </div>
                )}
                {c.materials.map((m) => (
                  <div key={m.id}>
                    <span className="activity-dot" />
                    <h4>Shared {m.title}</h4>
                    <small>{date(m.createdAt)}</small>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        {material && <MaterialPreview material={material} onClose={() => setMaterial(null)} />}
        {source && (
          <Modal title={source.title} onClose={() => setSource(null)} wide>
            <div className="source-text">{source.text}</div>
          </Modal>
        )}
      </SheetContent>
    </Sheet>
  );
}
