import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { ArrowUpRight, RotateCcw, X, LoaderCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { initials } from './api';

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={`brand ${light ? 'light' : ''}`} aria-label="Again home">
      <span className="brand-mark">
        <RotateCcw size={22} />
      </span>
      again<span className="brand-period">.</span>
    </Link>
  );
}
export function Avatar({
  name,
  size = 'normal',
  index = 0,
}: {
  name: string;
  size?: 'small' | 'normal' | 'large';
  index?: number;
}) {
  return (
    <span aria-hidden="true" className={`avatar avatar-${size} tone-${index % 5}`}>
      {initials(name)}
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      className={`modal ${wide ? 'wide' : ''}`}
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function Loading({ text = 'Opening your workspace…' }: { text?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} />
      <span>{text}</span>
    </div>
  );
}
export function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <div className="error-message" role="alert">
      {message}
    </div>
  ) : null;
}
export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-symbol">
        <RotateCcw size={25} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function ExternalLink({ url, children }: { url: string; children: ReactNode }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-link">
      {children}
      <ArrowUpRight size={15} />
    </a>
  );
}
export function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button className="button primary" type="submit" disabled={busy}>
      {busy ? <LoaderCircle size={17} className="spin" /> : null}
      {busy ? 'Saving…' : children}
      {!busy && <ArrowRight size={17} />}
    </button>
  );
}
