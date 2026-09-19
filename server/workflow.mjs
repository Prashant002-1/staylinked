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
    c.materials.map((m) => m.title).join('; '),
  ]);
  return '\uFEFF' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
