import { Globe, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Hint } from './ui';
import type { User } from './types';

export function isLinkedInLink(value: string) {
  try {
    const url = new URL(value.trim());
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      (url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com'))
    );
  } catch {
    return false;
  }
}

export function ContactLinks({ person }: { person: User }) {
  const seen = new Set<string>();
  const links = person.links.flatMap((link) => {
    try {
      const url = new URL(link.url);
      if (!['http:', 'https:'].includes(url.protocol) || seen.has(url.href)) return [];
      seen.add(url.href);
      const host = url.hostname.toLowerCase();
      const linkedIn = isLinkedInLink(url.href);
      return [{ ...link, url: url.href, host, linkedIn }];
    } catch {
      return [];
    }
  });
  return (
    <div className="contact-links" role="group" aria-label={`Contact ${person.name}`}>
      {person.email && (
        <Hint label={`Email ${person.name}`}>
          <Button
            variant="ghost"
            size="icon"
            render={
              <a
                href={`mailto:${encodeURIComponent(person.email)}`}
                aria-label={`Email ${person.name}`}
              />
            }
            nativeButton={false}
          >
            <Mail size={18} />
          </Button>
        </Hint>
      )}
      {links.map((link) => {
        const label = link.linkedIn ? `${person.name} on LinkedIn` : link.label || link.host;
        return (
          <Hint key={link.url} label={label}>
            <Button
              variant="ghost"
              size="icon"
              render={
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} (opens in a new tab)`}
                />
              }
              nativeButton={false}
            >
              {link.linkedIn ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M5.3 3a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6ZM3.3 9h4v12h-4V9Zm6.6 0h3.8v1.6c.6-1.1 1.8-1.9 3.5-1.9 3.8 0 4.5 2.5 4.5 5.7V21h-4v-5.9c0-1.4 0-3.2-2-3.2s-2.2 1.5-2.2 3.1v6H9.9V9Z" />
                </svg>
              ) : (
                <Globe size={18} />
              )}
            </Button>
          </Hint>
        );
      })}
    </div>
  );
}
