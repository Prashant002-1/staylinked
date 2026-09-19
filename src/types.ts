export type User = {
  id: string;
  kind: 'candidate' | 'recruiter';
  name: string;
  email: string;
  company?: string;
  headline: string;
  location?: string;
  bio: string;
  tags?: string[];
  links: { label: string; url: string }[];
  updatedAt?: string;
};
export type Event = {
  id: string;
  recruiterId: string;
  name: string;
  location: string;
  date: string;
  prompt: string;
};
export type Material = {
  id: string;
  candidateId: string;
  title: string;
  type: 'note' | 'file';
  text: string;
  createdAt: string;
  extraction?: string;
  size?: number;
};
export type Role = {
  id: string;
  title: string;
  team: string;
  description: string;
  requirements: string[];
};
export type Connection = {
  id: string;
  candidateId: string;
  recruiterId: string;
  eventId: string;
  conversation: string;
  originalConversation: string;
  highlight: string;
  interest: string;
  createdAt: string;
  updatedAt: string;
  remembered?: boolean;
  saved?: boolean;
  stage?: 'new' | 'reviewed' | 'follow-up' | 'contacted' | 'archived';
  shortlistedRoles?: string[];
  recruiterUpdatedAt?: string;
  candidate: User;
  event: Event;
  materials: Material[];
  recruiter?: Pick<User, 'name' | 'company' | 'headline'>;
};
export type Source = { id: string; title: string; text: string; kind: string };
export type Brief = {
  mode: 'local' | 'ai';
  summary: string;
  findings: {
    requirement: string;
    sourceId?: string | null;
    quote?: string | null;
    note: string;
  }[];
  fallback?: boolean;
  notice?: string;
  cached?: boolean;
  model?: string;
};
export type Workspace = { connections: Connection[]; events: Event[]; roles: Role[] };
