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

| Method and path | Purpose | Owner |
| --- | --- | --- |
| `GET /api/health` | deployment health check | integration |
| `GET /api/events` | list events near the user | API/events |
| `POST /api/events` | create an event | API/events |
| `GET /api/events/:id` | event details | API/events |
| `POST /api/events/:id/attendance` | join or leave | API/events |
| `GET /api/users/me` | current profile | API/users |
| `PUT /api/users/me/preferences` | update interests | API/users |

Changes to this document need agreement from both the related UI and API owners.
