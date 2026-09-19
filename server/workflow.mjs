import { z } from 'zod';

export const workflowChanges = z
  .object({
    saved: z.boolean().optional(),
    remembered: z.boolean().optional(),
    stage: z.enum(['new', 'reviewed', 'follow-up', 'contacted', 'archived']).optional(),
    roleId: z.string().min(1).max(180).optional(),
    shortlist: z.boolean().optional(),
  })
  .strict()
  .refine(
    (v) => (v.roleId === undefined) === (v.shortlist === undefined),
    'Specify a role and shortlist action together',
  );

export function applyWorkflow(connection, changes) {
  const { roleId, shortlist, ...fields } = changes;
  const roles = new Set(connection.shortlistedRoles || []);
  if (roleId) {
    if (shortlist) roles.add(roleId);
    else roles.delete(roleId);
  }
  return {
    ...connection,
    ...fields,
    shortlistedRoles: [...roles],
    recruiterUpdatedAt: new Date().toISOString(),
  };
}

export function csvCell(value) {
  let text = String(value ?? '');
  // Quoting alone does not prevent spreadsheet formulas in candidate-owned text.
  if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function connectionsCsv(connections) {
  const header = [
    'Name',
    'Email',
    'Headline',
    'Event',
    'Met at',
    'Conversation highlight',
    'Conversation',
    'Interest',
    'Status',
    'Saved',
    'Materials',
  ];
  const rows = connections.map((c) => [
    c.candidate.name,
    c.candidate.email,
    c.candidate.headline,
    c.event.name,
    c.createdAt,
    c.highlight,
    c.conversation,
    c.interest,
    c.stage || (c.remembered ? 'reviewed' : 'new'),
    c.saved ? 'Yes' : 'No',
    c.materials.map((m) => m.title).join('; '),
  ]);
  return '\uFEFF' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
