import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Download,
  FileText,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
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
import { Avatar, ErrorMessage, ExternalLink, Field, Loading, Modal, SubmitButton } from './ui';
import type { Material, User } from './types';

export function MaterialPreview({
  material,
  onClose,
}: {
  material: Material;
  onClose: () => void;
}) {
  return (
    <Modal title={material.title} onClose={onClose} wide>
      <div className="material-copy whitespace-pre-wrap break-words text-sm leading-7">
        {material.text || 'Open the original file to read this document.'}
      </div>
      {material.type === 'file' && (
        <Button
          variant="outline"
          render={<a href={`/api/materials/${material.id}/download`} />}
          nativeButton={false}
        >
          <Download /> Download original
        </Button>
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
  const [links, setLinks] = useState(user.links);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal title="Edit your profile" onClose={onClose} wide>
      <form
        className="form-stack"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError('');
          const data = Object.fromEntries(new FormData(event.currentTarget));
          try {
            const result = await api<{ user: User }>('/profile', {
              method: 'PUT',
              body: json({
                ...data,
                links: links.filter((link) => link.url.trim()),
                tags: String(data.tags)
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              }),
            });
            onSaved(result.user);
            toast.success('Profile updated');
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-row">
          <Field label="Name">
            <Input
              name="name"
              defaultValue={user.name}
              maxLength={100}
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
        <Field label="A little introduction">
          <Input
            name="headline"
            defaultValue={user.headline}
            maxLength={180}
            placeholder="Product engineer. Building things for people."
          />
        </Field>
        <Field label="About you">
          <Textarea name="bio" defaultValue={user.bio} rows={5} maxLength={8000} />
        </Field>
        <Field label="Things you work on" hint="Separate with commas. Up to 10.">
          <Input
            name="tags"
            defaultValue={user.tags?.join(', ')}
            placeholder="Design systems, TypeScript, accessibility"
          />
        </Field>
        <div className="flex items-center justify-between gap-3 pt-1">
          <h3 className="text-sm font-medium">Links</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={links.length >= 10}
            onClick={() => setLinks([...links, { label: '', url: '' }])}
          >
            <Plus /> Add link
          </Button>
        </div>
        {links.map((link, index) => (
          <div className="link-fields" key={index}>
            <Input
              aria-label={`Link ${index + 1} label`}
              placeholder="Portfolio"
              value={link.label}
              maxLength={80}
              required={!!link.url}
              onChange={(event) =>
                setLinks(
                  links.map((value, i) =>
                    i === index ? { ...value, label: event.target.value } : value,
                  ),
                )
              }
            />
            <Input
              aria-label={`Link ${index + 1} URL`}
              type="url"
              placeholder="https://"
              value={link.url}
              onChange={(event) =>
                setLinks(
                  links.map((value, i) =>
                    i === index ? { ...value, url: event.target.value } : value,
                  ),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove link ${index + 1}`}
              onClick={() => setLinks(links.filter((_, i) => i !== index))}
            >
              <X />
            </Button>
          </div>
        ))}
        <ErrorMessage message={error} />
        <div className="form-actions">
          <Button type="button" variant="outline" onClick={onClose}>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal title={material ? 'Edit your work' : 'Add your work'} onClose={onClose} wide>
      <form
        className="form-stack"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError('');
          const body = Object.fromEntries(new FormData(event.currentTarget));
          try {
            const result = await api<{ material: Material }>(
              material ? `/materials/${material.id}` : '/materials/note',
              { method: material ? 'PATCH' : 'POST', body: json(body) },
            );
            onSaved(result.material);
            toast.success(material ? 'Work updated' : 'Work added');
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Title">
          <Input
            name="title"
            defaultValue={material?.title}
            required
            maxLength={180}
            placeholder="A faster way to find the right document"
          />
        </Field>
        <Field label="The story">
          <Textarea
            name="text"
            defaultValue={material?.text}
            required
            minLength={20}
            maxLength={30000}
            rows={10}
            placeholder="What you built, what you learned, or what you're working on."
          />
        </Field>
        <ErrorMessage message={error} />
        <div className="form-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton busy={busy}>{material ? 'Save changes' : 'Add work'}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

export function Profile({ user, onUpdate }: { user: User; onUpdate: (user: User) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState<Material | 'new' | null>(null);
  const [preview, setPreview] = useState<Material | null>(null);
  const [removing, setRemoving] = useState<Material | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const load = useCallback(async () => {
    if (user.kind !== 'candidate') return;
    try {
      const result = await api<{ materials: Material[] }>('/candidate');
      setMaterials(result.materials);
      setError('');
    } catch (error) {
      setError((error as Error).message);
    }
  }, [user.kind, user.id]);
  useEffect(() => {
    void load();
  }, [load]);
  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    try {
      await api('/materials/upload', { method: 'POST', body });
      await load();
      toast.success('File added');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="social-profile">
      <section className="profile-identity">
        <div className="flex items-start justify-between gap-4">
          <Avatar name={user.name} size="large" />
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil /> Edit profile
          </Button>
        </div>
        <div className="mt-5">
          <h1>{user.name}</h1>
          {user.headline && <p className="mt-2 text-base text-muted-foreground">{user.headline}</p>}
          {user.location && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {user.location}
            </p>
          )}
        </div>
        <div className="profile-details mt-6 space-y-5">
          {user.bio && <p className="whitespace-pre-wrap text-sm leading-7">{user.bio}</p>}
          {!!user.tags?.length && (
            <p className="text-xs leading-6 text-muted-foreground">{user.tags.join(' · ')}</p>
          )}
          {!!user.links.length && (
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {user.links.map((link, index) => (
                <ExternalLink url={link.url} key={`${link.url}-${index}`}>
                  {link.label}
                </ExternalLink>
              ))}
            </div>
          )}
          {!user.bio && !user.headline && (
            <Button variant="link" className="px-0" onClick={() => setEditing(true)}>
              Add a little about yourself <ArrowUpRight />
            </Button>
          )}
        </div>
      </section>
      {user.kind === 'candidate' && (
        <section className="profile-work">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Your work</h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setNote('new')}>
                <Plus /> Write something
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => input.current?.click()}
              >
                <Upload />
                {uploading ? 'Uploading…' : 'Add a file'}
              </Button>
            </div>
            <input
              ref={input}
              type="file"
              accept=".pdf,.txt,.md"
              className="sr-only"
              aria-label="Upload work"
              disabled={uploading}
              onChange={(event) => {
                void upload(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </div>
          <ErrorMessage message={error} />
          {!materials && !error && <Loading />}
          {materials?.map((material) => (
            <article className="work-item" key={material.id}>
              <button
                className="work-item-content"
                type="button"
                onClick={() => setPreview(material)}
              >
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="size-3.5" />
                  {date(material.createdAt)}
                </span>
                <h3 className="mt-2 text-sm font-medium">{material.title}</h3>
                {material.text && (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {material.text}
                  </p>
                )}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Options for ${material.title}`}
                    />
                  }
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setPreview(material)}>
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
                      render={<a href={`/api/materials/${material.id}/download`} />}
                    >
                      <Download />
                      Download
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setDeleteError('');
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
          {materials?.length === 0 && (
            <div className="rounded-2xl border border-dashed p-7 text-center text-sm text-muted-foreground">
              A project, an essay, a small thing you made.
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">PDF, TXT, or Markdown. Up to 8 MB.</p>
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
          onSaved={() => {
            setNote(null);
            void load();
          }}
        />
      )}
      {preview && <MaterialPreview material={preview} onClose={() => setPreview(null)} />}
      {removing && (
        <Modal title="Remove this work?" onClose={() => setRemoving(null)}>
          <p className="text-sm leading-6 text-muted-foreground">
            “{removing.title}” will no longer appear on your profile.
          </p>
          <ErrorMessage message={deleteError} />
          <div className="form-actions">
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await api(`/materials/${removing.id}`, { method: 'DELETE' });
                  setRemoving(null);
                  await load();
                  toast.success('Work removed');
                } catch (error) {
                  setDeleteError((error as Error).message);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
