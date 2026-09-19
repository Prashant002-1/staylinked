import { useState } from 'react';
import { ArrowUpRight, Check, Download, FileSpreadsheet, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Modal } from './ui';
const integrations = [
  {
    name: 'Greenhouse',
    mark: 'g',
    color: '#187b5f',
    type: 'ATS',
    summary: 'Prospects, candidate notes, and attachments.',
    scopes: [
      'Create prospects from selected connections',
      'Attach the event recap and shared materials',
      'Associate a prospect with a job',
    ],
    url: 'https://www.greenhouse.com/',
  },
  {
    name: 'Ashby',
    mark: 'a',
    color: '#6d4ec5',
    type: 'ATS',
    summary: 'Candidate records and talent pools.',
    scopes: [
      'Create a candidate record',
      'Preserve the event source and recap',
      'Add selected candidates to a talent pool',
    ],
    url: 'https://www.ashbyhq.com/',
  },
  {
    name: 'Lever',
    mark: 'L',
    color: '#176c87',
    type: 'ATS',
    summary: 'Opportunities and recruiter notes.',
    scopes: [
      'Create a candidate opportunity',
      'Carry over event context as a note',
      'Associate shared work with the record',
    ],
    url: 'https://www.lever.co/',
  },
  {
    name: 'Workday',
    mark: 'w',
    color: '#d18b22',
    type: 'ATS',
    summary: 'Candidate handoff to your hiring workflow.',
    scopes: [
      'Export selected candidate details',
      'Map fields to your recruiting setup',
      'Preserve event source attribution',
    ],
    url: 'https://www.workday.com/',
  },
  {
    name: 'Gmail',
    mark: 'M',
    color: '#bb4444',
    type: 'Communication',
    summary: 'Personal follow-ups from your inbox.',
    scopes: [
      'Open a draft addressed to a connection',
      'Include the conversation you had',
      'Keep review and sending with the recruiter',
    ],
    url: 'https://workspace.google.com/products/gmail/',
  },
  {
    name: 'Outlook',
    mark: 'O',
    color: '#246fb1',
    type: 'Communication',
    summary: 'Email follow-ups and interview invitations.',
    scopes: [
      'Prepare an email draft',
      'Offer available interview times',
      'Keep review and sending in Outlook',
    ],
    url: 'https://www.microsoft.com/microsoft-365/outlook/email-and-calendar-software-microsoft-outlook',
  },
  {
    name: 'Slack',
    mark: '#',
    color: '#6f456b',
    type: 'Communication',
    summary: 'Share selected profiles with hiring teams.',
    scopes: [
      'Share a connection in a chosen channel',
      'Include the role and source evidence',
      'Limit access to your hiring team',
    ],
    url: 'https://slack.com/',
  },
  {
    name: 'Google Calendar',
    mark: '31',
    color: '#3979cc',
    type: 'Communication',
    summary: 'Schedule the next conversation.',
    scopes: [
      'View availability after authorization',
      'Prepare a calendar invitation',
      'Keep the recruiter in control of invitations',
    ],
    url: 'https://workspace.google.com/products/calendar/',
  },
];
export default function Integrations({
  onExport,
  canExport,
}: {
  onExport: () => void;
  canExport: boolean;
}) {
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<(typeof integrations)[number] | null>(null);
  return (
    <div className="page-content integration-page">
      <div className="page-heading">
        <h1>Integrations</h1>
      </div>
      <div className="export-connection">
        <span className="integration-symbol">
          <FileSpreadsheet size={23} />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3>CSV export</h3>
            <Badge variant="secondary">
              <Check className="size-3" />
              Available
            </Badge>
          </div>
          <p>Candidate details, event context, and status.</p>
        </div>
        <Button variant="outline" disabled={!canExport} onClick={onExport}>
          <Download />
          Export connections
        </Button>
      </div>
      <Tabs value={category} onValueChange={(v) => setCategory(String(v))}>
        <TabsList variant="line">
          {['All', 'ATS', 'Communication'].map((t) => (
            <TabsTrigger value={t} key={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="integration-grid">
        {integrations
          .filter((i) => category === 'All' || i.type === category)
          .map((i) => (
            <Button
              variant="outline"
              key={i.name}
              className="integration-card"
              onClick={() => setSelected(i)}
            >
              <div className="flex items-start justify-between">
                <span className="integration-logo" style={{ color: i.color }}>
                  {i.mark}
                </span>
                <Badge variant="outline" className="text-muted-foreground font-normal">
                  Planned
                </Badge>
              </div>
              <h3>{i.name}</h3>
              <p>{i.summary}</p>
            </Button>
          ))}
      </div>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="flex items-center gap-3">
            <span className="integration-logo" style={{ color: selected.color }}>
              {selected.mark}
            </span>
            <div>
              <Badge variant="outline">Planned integration</Badge>
              <p className="text-sm text-muted-foreground mt-2">
                No account connected. No data is being synced.
              </p>
            </div>
          </div>
          <h3 className="text-sm font-medium">Proposed workflow</h3>
          <ul className="integration-scopes">
            {selected.scopes.map((s) => (
              <li key={s}>
                <Plug className="size-4 text-muted-foreground" />
                {s}
              </li>
            ))}
          </ul>
          <div className="form-actions">
            <Button
              variant="outline"
              render={<a href={selected.url} target="_blank" rel="noreferrer" />}
              nativeButton={false}
            >
              Visit {selected.name}
              <ArrowUpRight />
            </Button>
            <Button onClick={() => setSelected(null)}>Done</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
