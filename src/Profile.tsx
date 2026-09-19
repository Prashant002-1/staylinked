import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  Download,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api, date, json } from './api';
import { Avatar, ErrorMessage, Field, Loading, Modal, SubmitButton } from './ui';
import type { Material, User } from './types';
import { ContactLinks, isLinkedInLink } from './ContactLinks';
import { useFileDownload } from './downloads';

function useFormRequest() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.abort();
    };
  }, []);
  const run = async <T,>(path: string, options: RequestInit, onSaved: (result: T) => void) => {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    try {
      const result = await api<T>(path, { ...options, signal: controller.signal });
      if (mounted.current && !controller.signal.aborted) onSaved(result);
    } catch (error) {
      if (mounted.current && !controller.signal.aborted) setError((error as Error).message);
    } finally {
      if (pending.current === controller) pending.current = null;
      if (mounted.current && !controller.signal.aborted) setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

export function MaterialPreview({
  material,
  onClose,
  onEdit,
}: {
  material: Material;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const fileDownload = useFileDownload();
  return (
    <Modal title={material.title} onClose={onClose} wide>
      <div className="material-copy whitespace-pre-wrap break-words text-sm leading-7">
        {material.text ||
          (material.type === 'file'
            ? 'The text preview isn’t available. Download the original to read it.'
            : 'Nothing has been added to this note yet.')}
      </div>
      {(material.type === 'file' || onEdit) && (
        <div className="form-actions">
          {material.type === 'file' && (
            <Button
              variant="outline"
              disabled={fileDownload.busy}
              onClick={() =>
                void fileDownload.download(`/materials/${material.id}/download`, material.title)
              }
            >
              {fileDownload.busy ? <Loader2 className="animate-spin" /> : <Download />}
              {fileDownload.busy ? 'Downloading…' : 'Download original'}
            </Button>
          )}
          {material.type === 'note' && onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Pencil />
              Edit note
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}

function ProfileEditor({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: (user: User) => void;
}) {
  const linkedInIndex = user.links.findIndex((link) => isLinkedInLink(link.url));
  const [linkedIn, setLinkedIn] = useState(user.links[linkedInIndex]?.url || '');
  const linkedInInput = useRef<HTMLInputElement>(null);
  const [links, setLinks] = useState(() =>
    user.links.map((link, id) => ({ ...link, id })).filter((link) => link.id !== linkedInIndex),
  );
  const nextLinkId = useRef(user.links.length);
  const linkInputs = useRef(new Map<number, HTMLInputElement>());
  const addLink = useRef<HTMLButtonElement>(null);
  const areas = useRef<HTMLInputElement>(null);
  const { busy, error, setError, run } = useFormRequest();
  return (
    <Modal title="Edit your profile" onClose={onClose} busy={busy} wide>
      <form
        className="form-stack"
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          const data = Object.fromEntries(new FormData(event.currentTarget));
          const tags = String(data.tags)
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
          if (tags.length > 10 || tags.some((tag) => tag.length > 50)) {
            setError('Add up to 10 areas of work, with 50 characters or fewer each.');
            areas.current?.focus();
            return;
          }
          if (linkedIn.trim() && !isLinkedInLink(linkedIn)) {
            setError('Use a LinkedIn URL, such as https://www.linkedin.com/in/your-name.');
            linkedInInput.current?.focus();
            return;
          }
          const filledLinks = links.filter((link) => link.url.trim());
          if (filledLinks.length + (linkedIn.trim() ? 1 : 0) > 10) {
            setError('Keep up to 10 links, including LinkedIn. Remove one before saving.');
            addLink.current?.focus();
            return;
          }
          const invalidLink = filledLinks.find((link) => !/^https?:\/\//i.test(link.url.trim()));
          if (invalidLink) {
            setError('Links need to start with https:// or http://.');
            linkInputs.current.get(invalidLink.id)?.focus();
            return;
          }
          void run<{ user: User }>(
            '/profile',
            {
              method: 'PUT',
              body: json({
                ...data,
                tags,
                links: [
                  ...(linkedIn.trim() ? [{ label: 'LinkedIn', url: linkedIn.trim() }] : []),
                  ...filledLinks.map(({ label, url }) => ({
                    label: label.trim(),
                    url: url.trim(),
                  })),
                ],
              }),
            },
            ({ user }) => {
              onSaved(user);
              toast.success('Profile updated');
            },
          );
        }}
      >
        <fieldset className="form-stack min-w-0" disabled={busy}>
          <div className="form-row">
            <Field label="Name">
              <Input
                name="name"
                defaultValue={user.name}
                maxLength={180}
                required
                autoComplete="name"
              />
            </Field>
            <Field label="Location">
              <Input
                name="location"
                defaultValue={user.location}
                maxLength={180}
                placeholder="Brooklyn, New York"
              />
            </Field>
          </div>
          <Field label="Headline">
            <Input
              name="headline"
              defaultValue={user.headline}
              maxLength={180}
              placeholder="Product engineer at Northstar"
            />
          </Field>
          <Field label="About">
            <Textarea name="bio" defaultValue={user.bio} rows={5} maxLength={8000} />
          </Field>
          <Field label="Areas of work" hint="Separate with commas. Up to 10.">
            <Input
              ref={areas}
              name="tags"
              defaultValue={user.tags?.join(', ')}
              placeholder="Design systems, TypeScript, accessibility"
            />
          </Field>
          <Field label="LinkedIn" hint="Optional">
            <Input
              ref={linkedInInput}
              type="url"
              value={linkedIn}
              onChange={(event) => setLinkedIn(event.target.value)}
              placeholder="https://www.linkedin.com/in/your-name"
              maxLength={1500}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </Field>
          <div className="flex items-center justify-between gap-3 pt-1">
            <h3 className="text-sm font-medium">Other links</h3>
            <Button
              ref={addLink}
              type="button"
              variant="ghost"
              size="sm"
              disabled={links.length + (linkedIn.trim() ? 1 : 0) >= 10}
              onClick={() => {
                const id = nextLinkId.current++;
                setLinks((current) => [...current, { label: '', url: '', id }]);
                requestAnimationFrame(() => linkInputs.current.get(id)?.focus());
              }}
            >
              <Plus />
              Add link
            </Button>
          </div>
          {links.map((link, index) => (
            <div
              className="link-fields"
              key={link.id}
              role="group"
              aria-label={`Link ${index + 1}`}
            >
              <Input
                aria-label={`Link ${index + 1} name`}
                placeholder="Portfolio"
                value={link.label}
                maxLength={80}
                onChange={(event) =>
                  setLinks(
                    links.map((value) =>
                      value.id === link.id ? { ...value, label: event.target.value } : value,
                    ),
                  )
                }
              />
              <Input
                ref={(element) => {
                  if (element) linkInputs.current.set(link.id, element);
                  else linkInputs.current.delete(link.id);
                }}
                aria-label={`Link ${index + 1} address`}
                type="url"
                placeholder="https://"
                value={link.url}
                maxLength={1500}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(event) =>
                  setLinks(
                    links.map((value) =>
                      value.id === link.id ? { ...value, url: event.target.value } : value,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${link.label || `link ${index + 1}`}`}
                onClick={() => {
                  const next = links[index + 1] || links[index - 1];
                  setLinks(links.filter((value) => value.id !== link.id));
                  requestAnimationFrame(() =>
                    next ? linkInputs.current.get(next.id)?.focus() : addLink.current?.focus(),
                  );
                }}
              >
                <X />
              </Button>
            </div>
          ))}
        </fieldset>
        <ErrorMessage message={error} />
        <div className="form-actions">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton busy={busy}>Save changes</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function NoteEditor({
  material,
  onClose,
  onSaved,
}: {
  material?: Material;
  onClose: () => void;
  onSaved: (material: Material) => void;
}) {
  const { busy, error, run } = useFormRequest();
  return (
    <Modal title={material ? 'Edit note' : 'Add a note'} onClose={onClose} busy={busy} wide>
      <form
        className="form-stack"
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          const body = Object.fromEntries(new FormData(event.currentTarget));
          void run<{ material: Material }>(
            material ? `/materials/${material.id}` : '/materials/note',
            { method: material ? 'PATCH' : 'POST', body: json(body) },
            (result) => {
              onSaved(result.material);
              toast.success(material ? 'Note updated' : 'Note added');
            },
          );
        }}
      >
        <fieldset className="form-stack min-w-0" disabled={busy}>
          <Field label="Title">
            <Input
              name="title"
              defaultValue={material?.title}
              required
              maxLength={180}
              placeholder="A faster way to find the right document"
            />
          </Field>
          <Field label="Description">
            <Textarea
              name="text"
              defaultValue={material?.text}
              required
              minLength={20}
              maxLength={30000}
              rows={10}
              placeholder="The project, your contribution, and what you learned."
            />
          </Field>
        </fieldset>
        <ErrorMessage message={error} />
        <div className="form-actions">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton busy={busy}>{material ? 'Save changes' : 'Add note'}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

export function Profile({ user, onUpdate }: { user: User; onUpdate: (user: User) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const workHeading = useRef<HTMLHeadingElement>(null);
  const materialRows = useRef(new Map<string, HTMLButtonElement>());
  const read = useRef<AbortController | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState<Material | 'new' | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Material | null>(null);
  const action = useFormRequest();
  const fileDownload = useFileDownload();
  const load = useCallback(async () => {
    if (user.kind !== 'candidate') return;
    read.current?.abort();
    const controller = new AbortController();
    read.current = controller;
    try {
      const result = await api<{ materials: Material[] }>('/candidate', {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setMaterials(result.materials);
      setLoadError('');
    } catch (error) {
      if (!controller.signal.aborted) setLoadError((error as Error).message);
    }
  }, [user.kind, user.id]);
  useEffect(() => {
    void load();
    window.addEventListener('focus', load);
    return () => {
      read.current?.abort();
      window.removeEventListener('focus', load);
    };
  }, [load]);
  const savedMaterial = (material: Material) => {
    read.current?.abort();
    setLoadError('');
    setMaterials((current) =>
      current?.some((item) => item.id === material.id)
        ? current.map((item) => (item.id === material.id ? material : item))
        : [material, ...(current || [])],
    );
    requestAnimationFrame(() => materialRows.current.get(material.id)?.focus());
  };
  const upload = (file?: File) => {
    if (!file || action.busy) return;
    if (!/\.(pdf|txt|md)$/i.test(file.name)) {
      action.setError('Choose a PDF, TXT, or Markdown file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      action.setError('Choose a file up to 8 MB.');
      return;
    }
    const body = new FormData();
    body.append('file', file);
    void action.run<{ material: Material }>(
      '/materials/upload',
      { method: 'POST', body },
      ({ material }) => {
        savedMaterial(material);
        toast.success('File added');
      },
    );
  };
  const preview = materials?.find((material) => material.id === previewId);
  const full = (materials?.length || 0) >= 20;
  const cannotAdd = action.busy || !materials || full;
  return (
    <div className="own-profile">
      <header className="profile-heading">
        <Avatar name={user.name} size="large" />
        <div className="profile-heading-copy">
          <h1>{user.name}</h1>
          {user.headline && <p>{user.headline}</p>}
          {user.location && <span>{user.location}</span>}
        </div>
        <Button variant="ghost" onClick={() => setEditing(true)}>
          <Pencil />
          Edit profile
        </Button>
      </header>
      <div className="own-contacts">
        <ContactLinks person={user} />
        <span>{user.email}</span>
      </div>
      {(user.bio || !!user.tags?.length) && (
        <section className="profile-section own-about">
          <h2>About</h2>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
          {!!user.tags?.length && <p className="profile-areas">{user.tags.join(' · ')}</p>}
        </section>
      )}
      {!user.bio && !user.headline && (
        <Button variant="link" className="px-0 mt-5" onClick={() => setEditing(true)}>
          Add an introduction <ChevronRight />
        </Button>
      )}
      {user.kind === 'candidate' && (
        <section className="profile-section profile-work" aria-labelledby="your-work-heading">
          <div className="section-topline">
            <div>
              <h2 id="your-work-heading" ref={workHeading} tabIndex={-1} className="section-title">
                Your work
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Visible to your connections</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={cannotAdd} onClick={() => setNote('new')}>
                <Plus />
                Add a note
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={cannotAdd}
                onClick={() => input.current?.click()}
              >
                {action.busy && !removing ? <Loader2 className="animate-spin" /> : <Upload />}
                {action.busy && !removing ? 'Uploading…' : 'Upload file'}
              </Button>
            </div>
            <input
              ref={input}
              type="file"
              accept=".pdf,.txt,.md"
              className="sr-only"
              aria-label="Upload work"
              disabled={cannotAdd}
              onChange={(event) => {
                upload(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </div>
          <ErrorMessage message={loadError || (!removing ? action.error : '')} />
          {loadError && (
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw />
              Try again
            </Button>
          )}
          {!materials && !loadError && <Loading />}
          {materials?.map((material) => (
            <article className="work-item" key={material.id}>
              <button
                ref={(element) => {
                  if (element) materialRows.current.set(material.id, element);
                  else materialRows.current.delete(material.id);
                }}
                className="work-item-content"
                type="button"
                onClick={() => setPreviewId(material.id)}
                aria-label={`Read ${material.title}`}
              >
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="size-3.5" />
                  <time dateTime={material.updatedAt || material.createdAt}>
                    {material.updatedAt ? 'Updated ' : ''}
                    {date(material.updatedAt || material.createdAt)}
                  </time>
                </span>
                <h3 className="work-title">{material.title}</h3>
                {material.text && <p className="work-excerpt">{material.text}</p>}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={action.busy}
                      aria-label={`Options for ${material.title}`}
                    />
                  }
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setPreviewId(material.id)}>
                    <FileText />
                    Read
                  </DropdownMenuItem>
                  {material.type === 'note' && (
                    <DropdownMenuItem onClick={() => setNote(material)}>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {material.type === 'file' && (
                    <DropdownMenuItem
                      disabled={fileDownload.busy}
                      onClick={() =>
                        void fileDownload.download(
                          `/materials/${material.id}/download`,
                          material.title,
                        )
                      }
                    >
                      <Download />
                      Download
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      action.setError('');
                      setRemoving(material);
                    }}
                  >
                    <Trash2 />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </article>
          ))}
          {materials?.length === 0 && <div className="muted py-5">No work shared yet.</div>}
          <p className="file-help">
            {full
              ? '20 items shared. Remove an item to add another.'
              : 'PDF, TXT, or Markdown. Up to 8 MB.'}
          </p>
        </section>
      )}
      {editing && (
        <ProfileEditor
          user={user}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            onUpdate(updated);
            setEditing(false);
          }}
        />
      )}
      {note && (
        <NoteEditor
          material={note === 'new' ? undefined : note}
          onClose={() => setNote(null)}
          onSaved={(material) => {
            savedMaterial(material);
            setNote(null);
          }}
        />
      )}
      {preview && (
        <MaterialPreview
          material={preview}
          onClose={() => setPreviewId(null)}
          onEdit={
            preview.type === 'note'
              ? () => {
                  setNote(preview);
                  setPreviewId(null);
                }
              : undefined
          }
        />
      )}
      {removing && (
        <Modal title="Remove this work?" onClose={() => setRemoving(null)} busy={action.busy}>
          <p className="text-sm leading-6 text-muted-foreground">
            “{removing.title}” will no longer be available to your connections.
          </p>
          <ErrorMessage message={action.error} />
          <div className="form-actions">
            <Button variant="outline" disabled={action.busy} onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={action.busy}
              onClick={() => {
                const id = removing.id;
                void action.run(`/materials/${id}`, { method: 'DELETE' }, () => {
                  read.current?.abort();
                  setMaterials((current) => current?.filter((item) => item.id !== id) || []);
                  setRemoving(null);
                  requestAnimationFrame(() => workHeading.current?.focus());
                  toast.success('Work removed');
                });
              }}
            >
              {action.busy ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
