import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LockKeyhole, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { api, date, json } from './api';
import { Avatar, Empty, ErrorMessage, Field, Loading, Modal, SubmitButton } from './ui';
import type { Connection, User, Update } from './types';

export default function Updates({
  user,
  connections,
  onPerson,
}: {
  user: User;
  connections: Connection[];
  onPerson: (c: Connection) => void;
}) {
  const [updates, setUpdates] = useState<Update[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Update | null>(null);
  const [removing, setRemoving] = useState<Update | null>(null);
  const requestVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const result = await api<{ updates: Update[] }>('/updates');
      if (version !== requestVersion.current) return;
      setUpdates(result.updates);
      setError('');
    } catch (e) {
      if (version === requestVersion.current) setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
    window.addEventListener('focus', refresh);
    return () => {
      requestVersion.current++;
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);
  return (
    <>
      <div className="social-page-heading">
        <div>
          <span className="eyebrow">IN YOUR CIRCLE</span>
          <h1>Updates</h1>
        </div>
        <span className="audience">
          <LockKeyhole size={14} />
          Your connections
        </span>
      </div>
      <form
        className="update-composer"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            const { update } = await api<{ update: Update }>('/updates', {
              method: 'POST',
              body: json({ text }),
            });
            requestVersion.current++;
            setUpdates((old) =>
              [update, ...(old || []).filter((item) => item.id !== update.id)].slice(0, 100),
            );
            setText('');
            void refresh();
            toast.success('Shared with your connections');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Avatar name={user.name} />
        <div>
          <Textarea
            aria-label="Share an update"
            disabled={busy}
            placeholder="What have you been working on?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={3000}
            required
            rows={3}
          />
          <div className="composer-actions">
            <span>Visible to people you’ve connected with</span>
            <Button type="submit" disabled={busy || !text.trim()}>
              {busy ? 'Sharing…' : 'Share update'}
            </Button>
          </div>
        </div>
      </form>
      <ErrorMessage message={error} />
      {!updates && !error && <Loading />}
      {updates?.length === 0 && (
        <Empty title="Nothing new just yet">
          Share a project, a thought, or what you’re looking for next.
        </Empty>
      )}
      <div className="updates-list">
        {updates?.map((update) => {
          const own = update.authorId === user.id;
          const connection = connections
            .filter(
              (c) =>
                (user.kind === 'recruiter' ? c.candidateId : c.recruiterId) === update.authorId,
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
          return (
            <article className="update-card" key={update.id}>
              <div className="update-author">
                <Avatar name={update.author.name} />
                <div>
                  <button disabled={!connection} onClick={() => connection && onPerson(connection)}>
                    {update.author.name}
                  </button>
                  <p>{update.author.headline}</p>
                </div>
                <time dateTime={update.createdAt}>{date(update.createdAt)}</time>
                {own && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" aria-label="Update options" />}
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(update)}>
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRemoving(update)}>
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <p className="update-body">{update.text}</p>
              <div className="update-footer">
                <span>
                  {update.updatedAt && update.updatedAt !== update.createdAt ? 'Edited' : ''}
                </span>
                {connection && (
                  <Button variant="ghost" size="sm" onClick={() => onPerson(connection)}>
                    Say hello
                    <ArrowUpRight />
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {editing && (
        <EditUpdate
          update={editing}
          onClose={() => setEditing(null)}
          onSave={(updated) => {
            requestVersion.current++;
            setUpdates((list) => list?.map((u) => (u.id === updated.id ? updated : u)) || []);
            setEditing(null);
            void refresh();
          }}
        />
      )}
      {removing && (
        <Modal title="Delete this update?" onClose={() => setRemoving(null)}>
          <p className="text-sm text-muted-foreground">
            It will be removed from your connections’ feeds.
          </p>
          <div className="form-actions">
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(`/updates/${removing.id}`, { method: 'DELETE' });
                  requestVersion.current++;
                  setUpdates((list) => list?.filter((u) => u.id !== removing.id) || []);
                  setRemoving(null);
                  void refresh();
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete update
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function EditUpdate({
  update,
  onClose,
  onSave,
}: {
  update: Update;
  onClose: () => void;
  onSave: (u: Update) => void;
}) {
  const [text, setText] = useState(update.text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal title="Edit update" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            onSave(
              (
                await api<{ update: Update }>(`/updates/${update.id}`, {
                  method: 'PATCH',
                  body: json({ text }),
                })
              ).update,
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Your update">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            maxLength={3000}
            rows={6}
          />
        </Field>
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
