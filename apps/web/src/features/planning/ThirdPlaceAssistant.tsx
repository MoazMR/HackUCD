import { useRef, useState, type FormEvent } from "react";
import type { AssistantMessage } from "@social-outings/shared";
import { api } from "../../lib/api";

const starters = [
  "I feel a bit lonely and want something relaxed today.",
  "I feel energetic. What nearby event suits me?",
  "Help me create a beginner-friendly poker night."
];

export function ThirdPlaceAssistant({ onBack }: { onBack: () => void }) {
  const conversationId = useRef(`web-${crypto.randomUUID()}`);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function send(event?: FormEvent, suggested?: string) {
    event?.preventDefault();
    const content = (suggested ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }].slice(-11);
    setMessages(next); setInput(""); setBusy(true); setError(undefined);
    try {
      // Full replies stay visible locally; bound the history sent back to the API.
      const response = await api.askAssistant(next.map((message) => ({ ...message, content: message.content.slice(0, 800) })), conversationId.current);
      setMessages([...next, { role: "assistant", content: response.reply }]);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The outing guide is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="assistant" aria-labelledby="assistant-heading">
      <header className="section-heading assistant__heading">
        <div><p className="eyebrow">Ask ThirdPlace</p><h1 id="assistant-heading">What would feel good today?</h1></div>
        <button className="button-secondary" type="button" onClick={onBack}>Back to For You</button>
      </header>
      <p className="assistant__intro">Tell ThirdPlace your mood or the activity you want to try. Suggestions use eligible published catalogue events, including demo data, inside your radius. Mood text is temporary and is not saved to your profile.</p>
      {messages.length === 0 && <div className="assistant__starters" aria-label="Example questions">{starters.map((starter) => <button type="button" key={starter} disabled={busy} onClick={() => void send(undefined, starter)}>{starter}</button>)}</div>}
      <div className="assistant__conversation" aria-live="polite">
        {messages.map((message, index) => <div className={`assistant__message assistant__message--${message.role}`} key={`${message.role}-${index}`}>{message.content}</div>)}
        {busy && <div className="assistant__message assistant__message--assistant">Finding a thoughtful match…</div>}
      </div>
      {messages.length > 0 && <button className="button-secondary" type="button" disabled={busy} onClick={() => { setMessages([]); setError(undefined); conversationId.current = `web-${crypto.randomUUID()}`; }}>Clear conversation</button>}
      <form className="assistant__composer" onSubmit={(event) => void send(event)}>
        <label htmlFor="assistant-message">Ask about an outing or creating one</label>
        <div><textarea id="assistant-message" rows={3} maxLength={800} value={input} onChange={(event) => setInput(event.target.value)} placeholder="I’ve had a long day and want something social but low-pressure…" /><button type="submit" disabled={busy || !input.trim()}>Ask</button></div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
      <p className="form-note">The guide cannot diagnose mood, publish events, make payments, or reveal private information. You choose every action.</p>
    </section>
  );
}
