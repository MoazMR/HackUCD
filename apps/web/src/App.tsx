import { TopBar } from "./components/TopBar";
import { DiscoverEvents } from "./features/discovery/DiscoverEvents";

export function App() {
  return (
    <main className="page-shell">
      <TopBar />
      <section className="hero">
        <p className="eyebrow">Your city, your people</p>
        <h1>Find something good to do nearby.</h1>
        <p>Discover local plans or create one people can join.</p>
      </section>
      <DiscoverEvents />
    </main>
  );
}
