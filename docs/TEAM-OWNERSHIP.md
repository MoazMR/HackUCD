# Team ownership and safe working areas

The aim is for each person to own a vertical slice of the product. Do not make two people edit the same screen or API route at once.

| Person | Owns | Safe folders | Branch |
| --- | --- | --- | --- |
| Kate | map, feed, search, filters, create/edit event UX, event details, public group-chat UI | `apps/web/src/features/discovery`, `apps/web/src/features/events`, selected presentational files in `apps/web/src/components` | `feature/kate-discovery-map` |
| Sarah | onboarding, preferences, profile, ID-verification status, endorsements | `apps/web/src/features/auth`, `apps/web/src/features/profile`, `apps/web/src/features/preferences` | `feature/sarah-profile-trust` |
| Moaz | event/profile APIs, recommendation, attendance, public event chat, reports | `apps/api/src/routes`, `apps/api/src/services`, `apps/api/src/models` | `feature/moaz-api-recommendations` |
| Cahal | business portal, promotion, Stripe sandbox, deployment integration | `apps/web/src/features/business`, related routes/services, `infra` | `feature/cahal-business-stripe` |

## Files that need coordination

Ask the team before editing these: root `package.json`, files directly inside `apps/web/src`, `apps/api/src/server.ts`, `packages/shared`, deployment files, and database migrations. Moaz and Cahal must agree before either changes a shared payment/event API shape.

## Definition of done for any task

1. Work is limited to the assigned feature folder.
2. The page or endpoint works using sample data.
3. `npm run typecheck` passes.
4. A short pull request explains what changed and includes a screenshot for UI changes.

## Suggested first week

1. Moaz publishes the event/profile API shapes in [API-CONTRACT.md](API-CONTRACT.md).
2. Kate and Sarah build against synthetic data if their endpoint is not ready.
3. Merge Moaz's API first, then Kate/Sarah, then Cahal's Stripe flow.
4. Replace mock storage with a database only after the create/discover/join workflow works.
