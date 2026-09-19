import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Camera, ImagePlus, Loader2, QrCode, Square } from 'lucide-react';
import jsQR from 'jsqr';
import { Button } from '@/components/ui/button';
import { api, date } from './api';
import { eventFromCode } from './lib/qr';
import { Avatar, ErrorMessage, Modal } from './ui';
import type { Event, User } from './types';

type Invitation = {
  event: Event;
  recruiter: Pick<User, 'name' | 'headline'>;
};
type ScanState = 'idle' | 'starting' | 'camera' | 'reading' | 'checking';

function decodeImage(
  source: CanvasImageSource,
  width: number,
  height: number,
  canvas = document.createElement('canvas'),
) {
  if (!width || !height) return null;
  const scale = Math.min(1, 1600 / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  if (canvas.width !== targetWidth) canvas.width = targetWidth;
  if (canvas.height !== targetHeight) canvas.height = targetHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This browser cannot read QR images. Try another browser.');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' });
}

export default function ScanQR({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [state, setState] = useState<ScanState>('idle');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef<number | null>(null);
  const imageUrl = useRef<string | null>(null);
  const lookup = useRef<AbortController | null>(null);
  const lookupTimer = useRef<number | null>(null);
  const retryCode = useRef<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const operation = useRef(0);
  const mounted = useRef(true);

  const stopResources = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
    imageUrl.current = null;
    lookup.current?.abort();
    lookup.current = null;
    if (lookupTimer.current !== null) window.clearTimeout(lookupTimer.current);
    lookupTimer.current = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current++;
      stopResources();
    };
  }, [stopResources]);

  const current = (id: number) => mounted.current && operation.current === id;
  const close = () => {
    operation.current++;
    stopResources();
    onClose();
  };
  const reset = () => {
    operation.current++;
    stopResources();
    setState('idle');
    setInvitation(null);
    setError('');
    setCanRetry(false);
    retryCode.current = null;
  };
  const checkCode = async (text: string, id: number) => {
    if (!current(id)) return;
    stopResources();
    const eventId = eventFromCode(text);
    if (!eventId) {
      retryCode.current = null;
      setCanRetry(false);
      setState('idle');
      setError('That is not a Staylinked invitation. Try the recruiter’s QR code.');
      return;
    }
    setState('checking');
    setError('');
    setCanRetry(false);
    retryCode.current = text;
    const controller = new AbortController();
    lookup.current = controller;
    const timeout = window.setTimeout(
      () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
      12_000,
    );
    lookupTimer.current = timeout;
    try {
      // The QR contributes only an event ID. Its host is never fetched or opened.
      const result = await api<Invitation>(`/portal/${encodeURIComponent(eventId)}`, {
        signal: controller.signal,
      });
      if (!current(id)) return;
      setInvitation(result);
      setState('idle');
    } catch (error) {
      if (current(id)) {
        setState('idle');
        setCanRetry(true);
        setError(
          controller.signal.reason?.name === 'TimeoutError'
            ? 'The invitation took too long to open. Try again.'
            : (error as Error).message,
        );
      }
    } finally {
      window.clearTimeout(timeout);
      if (lookupTimer.current === timeout) lookupTimer.current = null;
      if (lookup.current === controller) lookup.current = null;
    }
  };

  const useCamera = async () => {
    const id = ++operation.current;
    stopResources();
    setInvitation(null);
    setError('');
    setCanRetry(false);
    retryCode.current = null;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState('idle');
      setError('Camera access needs a secure connection. Choose a QR image instead.');
      return;
    }
    setState('starting');
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (!current(id)) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      if (!video.current) {
        stopResources();
        setState('idle');
        setError('Could not open the camera. Choose a QR image instead.');
        return;
      }
      video.current.srcObject = media;
      await video.current.play();
      if (!current(id)) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      setState('camera');
      media.getVideoTracks()[0]?.addEventListener(
        'ended',
        () => {
          if (!current(id) || stream.current !== media) return;
          stopResources();
          setState('idle');
          setError('The camera stopped. Try again or choose a QR image.');
        },
        { once: true },
      );
      let lastRead = 0;
      const canvas = document.createElement('canvas');
      const scan = (time: number) => {
        if (!current(id)) return;
        if (
          video.current &&
          video.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          time - lastRead >= 250
        ) {
          lastRead = time;
          try {
            const code = decodeImage(
              video.current,
              video.current.videoWidth,
              video.current.videoHeight,
              canvas,
            );
            if (code) {
              void checkCode(code.data, id);
              return;
            }
          } catch {
            stopResources();
            setState('idle');
            setError('Could not read the camera. Choose a QR image instead.');
            return;
          }
        }
        frame.current = requestAnimationFrame(scan);
      };
      frame.current = requestAnimationFrame(scan);
    } catch (error) {
      if (!current(id)) return;
      stopResources();
      setState('idle');
      const name = (error as DOMException).name;
      setError(
        name === 'NotAllowedError'
          ? 'Camera access was not allowed. Choose a QR image instead.'
          : name === 'NotFoundError'
            ? 'No camera found. Choose a QR image instead.'
            : 'Could not open the camera. Choose a QR image instead.',
      );
    }
  };

  const readFile = async (file?: File) => {
    if (!file) return;
    const id = ++operation.current;
    stopResources();
    setInvitation(null);
    setError('');
    setState('idle');
    setCanRetry(false);
    retryCode.current = null;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image containing the recruiter’s QR code.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Choose an image smaller than 10 MB.');
      return;
    }
    setState('reading');
    const url = URL.createObjectURL(file);
    imageUrl.current = url;
    const image = new Image();
    try {
      image.src = url;
      await image.decode();
      if (!current(id)) return;
      const code = decodeImage(image, image.naturalWidth, image.naturalHeight);
      if (!code) {
        setState('idle');
        setError('No QR code found. Try a clearer image with the whole code visible.');
        return;
      }
      await checkCode(code.data, id);
    } catch {
      if (current(id)) {
        setState('idle');
        setError('Could not read this image. Try a PNG, JPEG, or WebP image.');
      }
    } finally {
      if (imageUrl.current === url) {
        URL.revokeObjectURL(url);
        imageUrl.current = null;
      }
    }
  };

  const busy = ['starting', 'reading', 'checking'].includes(state);
  return (
    <Modal title="Scan a code" onClose={close}>
      <div className="qr-scanner" aria-busy={busy}>
        <div
          className="scanner-preview"
          data-camera={state === 'camera' || state === 'starting' || undefined}
        >
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            aria-label="QR camera preview"
            style={{ display: state === 'camera' ? 'block' : 'none' }}
          />
          {invitation ? (
            <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
              <Avatar name={invitation.recruiter.name} size="large" />
              <div>
                <h2 className="text-lg font-semibold">{invitation.recruiter.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {invitation.recruiter.headline}
                </p>
              </div>
              <div className="mt-2 text-sm">
                <p>{invitation.event.name}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {date(invitation.event.date)}
                  {invitation.event.location ? ` · ${invitation.event.location}` : ''}
                </p>
              </div>
            </div>
          ) : (
            state !== 'camera' && (
              <div
                className="flex flex-col items-center justify-center gap-3 px-5 py-10 text-sm text-muted-foreground"
                role={busy ? 'status' : undefined}
              >
                {busy ? (
                  <Loader2 className="size-7 animate-spin" aria-hidden="true" />
                ) : (
                  <QrCode className="size-10" strokeWidth={1.5} />
                )}
                <span>
                  {state === 'starting'
                    ? 'Opening camera…'
                    : state === 'reading'
                      ? 'Reading code…'
                      : state === 'checking'
                        ? 'Opening invitation…'
                        : 'Recruiter QR code'}
                </span>
              </div>
            )
          )}
        </div>
        <ErrorMessage message={error} />
        {canRetry && !busy && (
          <Button
            variant="outline"
            onClick={() => {
              if (retryCode.current) void checkCode(retryCode.current, ++operation.current);
            }}
          >
            Try again
          </Button>
        )}
        <div className="scanner-actions mt-4 flex flex-wrap gap-2">
          {invitation ? (
            <>
              <Button
                className="flex-1"
                onClick={() => {
                  const path = `/connect/${encodeURIComponent(invitation.event.id)}`;
                  close();
                  navigate(path);
                }}
              >
                Continue <ArrowRight />
              </Button>
              <Button variant="outline" onClick={reset}>
                Scan another
              </Button>
            </>
          ) : (
            <>
              {state === 'camera' || state === 'starting' ? (
                <Button variant="outline" className="flex-1" onClick={reset}>
                  <Square />
                  {state === 'camera' ? 'Stop camera' : 'Cancel camera'}
                </Button>
              ) : (
                <Button className="flex-1" disabled={busy} onClick={() => void useCamera()}>
                  <Camera />
                  Use camera
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                disabled={state === 'reading' || state === 'checking'}
                onClick={() => {
                  reset();
                  input.current?.click();
                }}
              >
                <ImagePlus />
                Choose image
              </Button>
              {(state === 'reading' || state === 'checking') && (
                <Button variant="ghost" onClick={reset}>
                  Cancel
                </Button>
              )}
            </>
          )}
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose QR image"
            disabled={state === 'reading' || state === 'checking'}
            onChange={(event) => {
              void readFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
