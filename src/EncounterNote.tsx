import { History, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { date } from './api';
import type { Connection } from './types';

export function EncounterNote({
  current,
  encounters,
  recruiter,
  onChange,
}: {
  current: Connection;
  encounters: Connection[];
  recruiter: boolean;
  onChange: (id: string) => void;
}) {
  const meetingDate = current.event.date || current.createdAt;
  return (
    <section className="encounter-content" aria-labelledby={`meeting-${current.id}`}>
      <header className="encounter-heading">
        <div className="encounter-identity">
          <p className="encounter-label">Where we met</p>
          <h2 id={`meeting-${current.id}`}>{current.event.name}</h2>
          <p className="encounter-place">
            <time dateTime={meetingDate}>{date(meetingDate)}</time>
            {current.event.location && (
              <>
                <span aria-hidden="true">·</span>
                <span>{current.event.location}</span>
              </>
            )}
          </p>
        </div>
        {encounters.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="sm" className="meeting-switcher" />}
            >
              <History />
              Change meeting
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="meeting-menu">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{encounters.length} recorded meetings</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={current.id} onValueChange={onChange}>
                  {encounters.map((encounter) => (
                    <DropdownMenuRadioItem
                      key={encounter.id}
                      value={encounter.id}
                      label={encounter.event.name}
                      className="meeting-option"
                      closeOnClick
                    >
                      <span>
                        <strong>{encounter.event.name}</strong>
                        <span>
                          {date(encounter.event.date || encounter.createdAt)}
                          {encounter.event.location && ` · ${encounter.event.location}`}
                        </span>
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      <h3>{current.highlight}</h3>
      <p>{current.conversation}</p>
      <footer className="encounter-byline">
        <span>
          {recruiter ? `Shared by ${current.candidate.name.split(' ')[0]}` : 'Your note'}
          {` · ${date(current.createdAt)}`}
          {current.updatedAt !== current.createdAt ? ` · edited ${date(current.updatedAt)}` : ''}
        </span>
        {!recruiter && (
          <Button
            variant="ghost"
            size="sm"
            render={<Link to={`/connect/${current.eventId}`} />}
            nativeButton={false}
          >
            <Pencil />
            Edit note
          </Button>
        )}
      </footer>
      {current.originalConversation !== current.conversation && (
        <details className="original-note">
          <summary>Original note</summary>
          <p>{current.originalConversation}</p>
        </details>
      )}
    </section>
  );
}
