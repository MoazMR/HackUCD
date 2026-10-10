import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { ChatMessage } from "./types";
import { MAX_MESSAGE_LENGTH } from "./useEventsStore";

type Props = {
  eventTitle: string;
  messages: ChatMessage[];
  canPost: boolean;
  onPost: (text: string) => boolean;
};

const timeFormat = new Intl.DateTimeFormat("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false });

/** Public group chat for an event. There is deliberately no private-message path. */
export function GroupChat({ eventTitle, messages, canPost, onPost }: Props) {
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages.length]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (onPost(draft)) setDraft("");
  }

  return (
    <section className="tp-chat" aria-labelledby={`${inputId}-title`}>
      <div className="tp-chat__head">
        <h3 id={`${inputId}-title`}>Group chat</h3>
        <p>Public to everyone in “{eventTitle}”. There are no private messages on ThirdPlace.</p>
      </div>
      <div className="tp-chat__log" ref={logRef} role="log" aria-live="polite" aria-label="Group chat messages" tabIndex={0}>
        {messages.length === 0 && <p className="tp-muted">No messages yet. Say hello to the group.</p>}
        {messages.map((message) => (
          <div key={message.id} className={`tp-msg${message.mine ? " tp-msg--mine" : ""}`}>
            <p className="tp-msg__who">
              {message.author} <time dateTime={message.sentAt}>{timeFormat.format(new Date(message.sentAt))}</time>
            </p>
            <p className="tp-msg__text">{message.text}</p>
          </div>
        ))}
      </div>
      {canPost ? (
        <form className="tp-chat__form" onSubmit={submit}>
          <label htmlFor={inputId} className="tp-visually-hidden">Message to the group</label>
          <input
            id={inputId}
            value={draft}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Message the group"
            autoComplete="off"
          />
          <button type="submit" className="tp-btn tp-btn--primary" disabled={!draft.trim()}>Send</button>
        </form>
      ) : (
        <p className="tp-chat__locked">Join this event to take part in the group chat. Be kind, and don't share personal contact details.</p>
      )}
    </section>
  );
}
