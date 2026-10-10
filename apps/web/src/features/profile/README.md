# Profile, My Events, onboarding and trust (Sarah)

Screens live in `features/auth`, `features/preferences` and `features/profile`. They are not yet mounted in
`apps/web/src/App.tsx`, because that file needs team agreement before anyone edits it.

## Run them now

`npm run dev`, then open `http://localhost:5173/src/features/profile/preview.html`. The preview is development-only.

Error states: add `?simulate=report-failure` or `?simulate=verification-failure` before the `#` in the URL.

## Mount them in the app shell

```tsx
import { Onboarding } from "./features/auth";
import { EndorsementScreen, MyEventsView, ProfileProvider, ProfileView, useProfile } from "./features/profile";

// Wrap the app once:            <ProfileProvider>…</ProfileProvider>
// Gate first run:               !useProfile().profile.onboarded && <Onboarding onComplete={goToForYou} />
// Profile destination:          <ProfileView />
// My Events destination:        <MyEventsView onOpenChat={openEventChat} onOpenEvent={openEvent} onEndorse={openEndorse} />
// After a past event:           <EndorsementScreen event={event} onDone={backToMyEvents} />
```

`useProfile().profile` gives the feed `interests`, `areaId` and `radiusKm` for recommendations.

## Assumptions

- The profile is kept in this browser's `localStorage` until `GET /api/users/me` and `PUT /api/users/me/preferences` exist.
- My Events and endorsement figures are labelled sample data until the API has attendance and endorsements.
- `trustApi.ts` is the mock boundary for the ID check and for endorsements/reports. The browser stores only a check status
  (`not_started | pending | verified | failed`). There is no ID upload, ID number field or document storage, and reports
  are only queued for a moderator: nothing in the browser bans or hides a person.
- The profile type has no birth date, address, coordinates, phone or email. Other people's view is built only by
  `toPublicProfile`, which copies allowed fields one by one.
- There is no private messaging. My Events links only to an event's public group chat.
