# ThirdPlace

Location-based social outings: discover nearby events, create one, and join people doing things nearby.

## Start locally

1. Install [Node.js 20 or newer](https://nodejs.org/).
2. Run `npm install` from the repository root.
3. Run `npm run dev`.
4. Open `http://localhost:5173`. The API runs at `http://localhost:3001`.

## Product scope

ThirdPlace helps people safely discover and create local events. People browse a map and feed, set interests and travel radius, create or join events, and chat only in the event's public group space. Businesses can create and pay to promote events; users can optionally pay to promote an event.

For the hackathon, the complete demo journey is: **onboard with preferences -> For You feed -> Map or event details -> join public group chat -> attend -> leave an endorsement -> create or promote an event.** The four main user views are **For You**, **Map**, **My Events**, and **Profile**. Read `docs/DESIGN.md` before building navigation.

Read [docs/TEAM-OWNERSHIP.md](docs/TEAM-OWNERSHIP.md) before changing code. It assigns the four team members, safe folders, and integration order.

All web UI must follow [docs/DESIGN.md](docs/DESIGN.md): a distinct ThirdPlace design inspired by the clarity and locality of Manna, Once Upon, and Deliveroo, without copying their branding or assets.

## Repository layout

- `apps/web`: the user-facing website.
- `apps/api`: the backend HTTP API.
- `packages/shared`: types and validation shared by both apps.
- `docs`: product decisions, API contracts, and onboarding notes.

## Mandatory Git workflow

Every feature must use its assigned branch and a pull request. Never work directly on `main`. The four first-task branches have already been published.

1. Switch to your assigned branch, for example `git checkout feature/kate-discovery-map`.
2. Bring in the latest shared work before editing: `git pull origin main`.
3. Change only the folders assigned to you below. Do not overwrite another person's changes.
4. Run `npm run typecheck` and the relevant local workflow before committing.
5. Commit with a clear message, push the branch, and open a PR into `main`.
6. Do not merge your own PR. A different teammate reviews it and the integration owner merges it only after checks pass.

Never commit secrets, API keys, identity documents, or `.env` files.

## Copy-ready prompts for your coding agents

Give each person **only their own prompt**. They must follow the Git workflow above before they edit anything.

### Kate - discovery and event experience

```text
You are Kate's coding agent for the ThirdPlace repository. First read README.md and docs/TEAM-OWNERSHIP.md. Before editing, checkout the already-created branch feature/kate-discovery-map and run git pull origin main. Do not work on main and do not edit files outside the folders assigned to Kate without asking.

Build the main user discovery and ordinary-user event experience in apps/web/src/features/discovery, apps/web/src/features/events, and reusable presentational components in apps/web/src/components only when necessary. First read docs/DESIGN.md and create an original responsive UI consistent with it; do not copy Manna, Once Upon, or Deliveroo branding/assets. Implement the For You and Map main views plus the create-event, event-detail, join, and public event-group chat flows. For You is the default recommended event feed with a visibly placed Create Event action. Map shows the user's approximate location and event hotspots, with accessible list fallback. A user interested in poker, football, padel, and tennis should only be recommended matching relevant events, not unrelated knitting events. Include useful loading, empty, and error states. Use the shared event API contract; do not change it yourself.

Use realistic, clearly labelled synthetic local event data if the API is not ready. Keep private user information off event cards. Run npm run typecheck, test the workflow locally, commit, push, and open a PR into main with a screenshot and a short test summary. Do not merge the PR.
```

### Sarah - accounts, profiles, trust, and safety UI

```text
You are Sarah's coding agent for the ThirdPlace repository. First read README.md and docs/TEAM-OWNERSHIP.md. Before editing, checkout the already-created branch feature/sarah-profile-trust and run git pull origin main. Do not work on main and do not edit files outside Sarah's assigned folders without asking.

Build the user onboarding, Profile, My Events, preferences, and trust experience in apps/web/src/features/auth, apps/web/src/features/profile, and apps/web/src/features/preferences. The My Events main view separates upcoming and past joined/created events, lets users open an event's public group chat, and respects the setting to show or hide previous attendance history. The Profile main view collects age range/age validation, self-described gender (optional), approximate location, interests, and travel radius; it provides photo/name editing, settings, privacy controls, verification status, and trust score. Make clear that only an approximate location is public. Show a public-safe profile with interests, endorsement/trust score, and no private contact details, address, birth date, ID number, or exact location.

Create a mock ID-verification status flow for Irish IDs: verified / pending / failed, with clear consent and an explanation that the prototype never stores or displays ID images or ID numbers. Build the post-event endorsement screen: endorse, do-not-endorse/report, and a clear warning that reports are reviewed; do not automatically ban a person solely in the browser. Private messaging must not exist. Run npm run typecheck, test success and failure states locally, commit, push, and open a PR into main with screenshots and a short test summary. Do not merge the PR.
```

### Moaz - backend, recommendation, moderation, and public event chat

```text
You are Moaz's coding agent for the ThirdPlace repository. First read README.md and docs/TEAM-OWNERSHIP.md. Before editing, checkout the already-created branch feature/moaz-api-recommendations and run git pull origin main. Do not work on main and do not edit files outside Moaz's assigned folders without asking.

Build backend routes and services in apps/api/src/routes, apps/api/src/services, and apps/api/src/models. Provide APIs for profiles/preferences, events, search/filtering by type/location/distance/paid status, joining an event, public event-group messages, endorsements, and verification status. Implement a transparent recommendation function: score nearby upcoming events using matching interests, distance within the user's chosen radius, and event category; return an explanation such as 'Matches football and is 2 km away.' Exclude events outside the radius and unrelated categories unless explicitly requested.

Use synthetic data and document assumptions. Ensure no direct-message route or private-message data model exists. Model reports separately from endorsements; a threshold such as three credible reports may flag an account for moderator review, not silently delete it. ID verification must use a mock status/provider boundary only: never collect, log, or persist actual ID document contents in this prototype. Update API documentation if endpoints change, run npm run typecheck, test normal/boundary/failure requests, commit, push, and open a PR into main. Do not merge the PR.
```

### Cahal - business portal, promotions, Stripe sandbox, and integration

```text
You are Cahal's coding agent for the ThirdPlace repository. First read README.md and docs/TEAM-OWNERSHIP.md. Before editing, checkout the already-created branch feature/cahal-business-stripe and run git pull origin main. Do not work on main and do not edit files outside Cahal's assigned folders without asking.

Build a clearly separate business experience in apps/web/src/features/business and its related backend endpoints under apps/api/src/routes and apps/api/src/services. Businesses can create venue-based events and choose a paid promotion/boost; ordinary users can optionally promote one of their own events. Clearly label paid/promoted events in the map/feed. Add Stripe sandbox Checkout through a server-side route, using environment variables only and no secret keys in the client or repository. After the sandbox success callback/webhook, record a mock order and activate the promotion in the product. Include a pricing screen that says what the payment buys, price, and currency.

Keep payments optional: regular users can browse, join, and create events without paying. Coordinate API shapes with Moaz using docs/API-CONTRACT.md rather than editing his core event route without agreement. Add setup instructions for required Stripe test variables, run npm run typecheck, test cancellation and successful sandbox return locally, commit, push, and open a PR into main with screenshots and a short test summary. Do not merge the PR.
```
