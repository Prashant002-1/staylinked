import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiBlob } from './api';

type DownloadOptions = Omit<RequestInit, 'signal'>;

export function useFileDownload() {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const pending = useRef<AbortController | null>(null);
  const urls = useRef(new Map<string, number>());
  useEffect(() => {
    mounted.current = true;
    const activeUrls = urls.current;
    return () => {
      mounted.current = false;
      pending.current?.abort();
      for (const [url, timer] of activeUrls) {
        window.clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      activeUrls.clear();
    };
  }, []);
  const download = useCallback(
    async (path: string, fileName: string, options: DownloadOptions = {}) => {
      if (pending.current) return;
      const controller = new AbortController();
      pending.current = controller;
      setBusy(true);
      try {
        const blob = await apiBlob(path, { ...options, signal: controller.signal });
        if (!mounted.current || controller.signal.aborted) return;
        const url = URL.createObjectURL(blob);
        const timer = window.setTimeout(() => {
          URL.revokeObjectURL(url);
          urls.current.delete(url);
        }, 1000);
        urls.current.set(url, timer);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName.replace(/[\\/]/g, '-');
        link.hidden = true;
        document.body.append(link);
        try {
          link.click();
        } finally {
          link.remove();
        }
      } catch (error) {
        if (mounted.current && !controller.signal.aborted) toast.error((error as Error).message);
      } finally {
        if (pending.current === controller) pending.current = null;
        if (mounted.current && !controller.signal.aborted) setBusy(false);
      }
    },
    [],
  );
  return { busy, download };
}
