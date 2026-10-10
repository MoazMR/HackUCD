import { DiscoverEvents } from "./features/discovery/DiscoverEvents";

export function App() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/">Outings</a>
        <nav aria-label="Primary navigation">
          <a href="#discover">Discover</a>
          <a href="#create">Create an outing</a>
          <a href="#profile">Profile</a>
        </nav>
      </header>
      <section className="hero">
        <p className="eyebrow">Your city, your people</p>
        <h1>Find something good to do nearby.</h1>
        <p>Discover local plans or create one people can join.</p>
      </section>
      <DiscoverEvents />
    </main>
  );
}
