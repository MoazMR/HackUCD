# API contract v0

The web app calls `/api`. In local development Vite forwards that path to the API server.

## Event

```ts
type Event = {
  id: string;
  title: string;
  description: string;
  startsAt: string; // ISO timestamp
  locationName: string;
  category: "food" | "sport" | "music" | "social" | "other";
  attendeeCount: number;
};
```

The API may add `coordinates`, `interests`, `isPaidPromotion`, and `attendeeIds` to its synthetic event records. UI code should import these shapes from `@social-outings/shared` rather than duplicating them.

| Method and path | Purpose | Owner |
| --- | --- | --- |
| `GET /api/health` | deployment health check | integration |
| `GET /api/events` | list events near the user | API/events |
| `POST /api/events` | create an event | API/events |
| `GET /api/events/:id` | event details | API/events |
| `POST /api/events/:id/attendance` | join an event idempotently | API/events |
| `GET /api/events/:id/messages` | list public event-group messages | API/events |
| `POST /api/events/:id/messages` | post to the public event group | API/events |
| `GET /api/profiles/:id` | profile and discovery preferences | API/users |
| `PUT /api/profiles/:id/preferences` | update interests and travel radius | API/users |
| `GET /api/profiles/:id/verification` | read mock verification status | API/users |
| `POST /api/profiles/:id/verification` | advance mock verification status; accepts no documents | API/users |
| `GET /api/recommendations?userId=:id` | transparent nearby recommendations | API/recommendations |
| `POST /api/endorsements` | record a post-event endorsement | API/trust |
| `POST /api/reports` | create a separate moderation report | API/trust |
| `GET /api/reports/:subjectId/status` | read moderator-review flag status | API/trust |
| `POST /api/event-plans` | generate a safe event-plan draft through OpenRouter or labelled synthetic fallback | shared integration |

## Event planner

`POST /api/event-plans` accepts:

```ts
type EventPlanRequest = {
  goal: string;
  area: string; // approximate public area only
  category: EventCategory;
  date: string; // parseable date/time
  attendeeCount?: number; // 2..100
  budget?: string;
};
```

It returns `{ plan, provider, model?, notice? }`. `provider` is `openrouter` only when `OPENROUTER_API_KEY` is configured; otherwise it is `synthetic`. The client never receives the key. Do not put profile data, exact locations, identity documents, contact details, or private messages in this request.

Changes to this document need agreement from both the related UI and API owners.
