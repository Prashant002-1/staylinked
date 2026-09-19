import type { ReactNode, RefObject } from 'react';
import { ArrowUpRight, Loader2, Inbox, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar as AvatarRoot, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
export { Loading, ErrorMessage } from './feedback';
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Staylinked home">
      <span className="brand-mark" aria-hidden="true" />
      Staylinked
    </Link>
  );
}
const avatarUrl = (name: string) => {
  let hash = 2166136261;
  for (const character of name) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619) >>> 0;
  return `/avatars/person-${hash % 32}.svg`;
};
export function Avatar({
  name,
  size = 'normal',
}: {
  name: string;
  size?: 'small' | 'normal' | 'large';
  index?: number;
}) {
  return (
    <AvatarRoot
      className={cn(
        'person-avatar rounded-full',
        size === 'small' ? 'size-8' : size === 'large' ? 'size-16' : 'size-10',
      )}
    >
      <AvatarImage src={avatarUrl(name)} alt="" className="rounded-[inherit]" />
      <AvatarFallback className="rounded-[inherit] bg-secondary text-muted-foreground">
        <UserRound className="size-4" />
      </AvatarFallback>
    </AvatarRoot>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  busy = false,
  initialFocus,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  busy?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className={cn('app-dialog max-h-[90dvh]', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}
        aria-describedby={undefined}
        aria-busy={busy}
        showCloseButton={!busy}
        initialFocus={initialFocus}
      >
        <DialogHeader className="app-dialog-header">
          <DialogTitle className="text-lg font-semibold pr-6">{title}</DialogTitle>
        </DialogHeader>
        <div className="app-dialog-body">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <Inbox className="size-7 text-muted-foreground mb-3" />
      <h3 className="font-medium text-sm">{title}</h3>
      {children && <p className="text-sm text-muted-foreground mt-1 max-w-xs">{children}</p>}
    </div>
  );
}
export function ExternalLink({ url, children }: { url: string; children: ReactNode }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
    >
      {children}
      <ArrowUpRight className="size-3.5" />
    </a>
  );
}
export function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <Button type="submit" disabled={busy} className="h-9">
      {busy && <Loader2 className="size-4 animate-spin" />}
      {busy ? 'Saving…' : children}
    </Button>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select
      value={value}
      items={options}
      onValueChange={(v) => {
        if (v !== null) onChange(v);
      }}
    >
      <SelectTrigger aria-label={label} className={cn('h-9 min-w-36 bg-background', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Hint({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
