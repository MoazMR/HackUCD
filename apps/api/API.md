# ThirdPlace prototype API

All endpoints use synthetic in-memory data and reset when the server restarts. Coordinates are approximate points for event discovery, never a user's address.

## Events

- `GET /api/events?type=sport&location=Riverside&latitude=53.3498&longitude=-6.2603&distanceKm=8&paid=true` filters by category, location-name substring, distance, and paid-promotion status. Distance requires both coordinates and `distanceKm`.
- `GET /api/events/:id` returns one event.
- `POST /api/events/:id/attendance` with `{ "userId": "me" }` joins once; repeating it is idempotent.
- `GET /api/events/:id/messages` and `POST /api/events/:id/messages` provide only an event's public group messages. A post needs `{ "authorId": "me", "body": "See you there" }`.

## Profiles and recommendations

- `GET /api/profiles/:id` returns profile and preference data.
- `PUT /api/profiles/:id/preferences` accepts `{ "interests": ["football"], "travelRadiusKm": 8 }`; radius is greater than zero and at most 100 km.
- `GET /api/recommendations?userId=me` ranks upcoming synthetic events within the selected radius. It requires an interest or category match by default and returns score, distance, and an explanation. `includeUnrelated=true` explicitly opts into otherwise unrelated in-radius events.

## Trust and safety

- `POST /api/endorsements` accepts `{ "authorId", "subjectId", "eventId" }`.
- `POST /api/reports` accepts `{ "reporterId", "subjectId", "reason", "eventId?" }`; reports are distinct from endorsements. At three credible synthetic reports, `GET /api/reports/:subjectId/status` returns `flagged_for_review`. The account is not deleted or banned.
- `GET` and `POST /api/profiles/:id/verification` expose a mock provider status (`unverified`, `pending`, `verified`, or `failed`). The boundary accepts no ID image, number, scan, or document data, and none is persisted or logged.

There are intentionally no direct-message routes or private-message models in this prototype.
