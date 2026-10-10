# Judging prep

A working checklist against the five criteria and the Stripe bonus. Items marked **To do** need a person; nothing here has been done for you unless it says **Done**.

## 1. AI usage: run the planner live (protects 10 points)

A project without a demonstrated OpenRouter feature scores zero for AI usage. Without a key, "Plan an event" returns a canned plan labelled "Synthetic demo plan", which does not count.

**To do, on the demo laptop:**

1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` (any chat model your key can use).
3. Restart with `npm run dev`, open **Plan an event**, generate a plan, and check the result says **Generated with OpenRouter**.
4. Run it four or five times with different goals before judging and note anything odd in the table below.

Also demonstrate **Ask ThirdPlace** with a mood request, an event recommendation, and event-creation guidance. OpenClaw is optional: configure `OPENCLAW_GATEWAY_URL` and server-only `OPENCLAW_GATEWAY_TOKEN` to try it first; configured OpenRouter is the next provider, followed by an explicitly labelled rule-based fallback. The guide uses the eligible catalogue and discloses promoted suggestions. It has no publishing, payment, diagnostic, identity-document, or private-message tools. ThirdPlace does not persist conversation/mood text; configured providers receive the request context under their own retention policies.

| Prompt | What came back | Problem spotted | What we did about it |
| --- | --- | --- | --- |
| | | | |

**What to say about its limits (all true of the code today):**

- The model can invent venues or details that do not exist, so the plan is a draft the host edits. Nothing is published automatically.
- The API only accepts a reply that parses as JSON with the expected fields. Anything else is rejected with an error instead of being shown.
- The prompt tells the model never to ask for private contact details or exact addresses.
- If OpenRouter is slow or down, the request times out after 15 seconds and the form shows an error.
- Every result is labelled with where it came from: OpenRouter and the model name, or the synthetic fallback.

## 2. Stripe bonus (5 points)

**To do:** read the bonus rules linked from the scoring page first; this checklist only covers what the code needs.

1. In the Stripe dashboard, switch to test mode and copy the secret key (`sk_test_...`). The API refuses live keys.
2. Put it in `apps/api/.env` as `STRIPE_SECRET_KEY` and restart.
3. Open **For businesses**, save a future venue-event draft, and confirm it is absent from the public feed. Choose Venue Boost and pay with a Stripe test card (`4242 4242 4242 4242`, any future date, any CVC).
4. Confirm the verified success return or signed webhook records a paid sandbox order, publishes the event, and shows **Promoted** with the sponsor name in For You and Map. A browser success query alone cannot activate it.
5. Cancel a checkout and confirm the business event remains a draft. Ordinary-user creation is free; Community Boost is optional for the event owner.
6. Check impressions, opens, joins, direction taps, and cost-per-join in aggregate analytics. These are prototype event counters, not evidence of unique people or guaranteed attendance.

The automatic payment smoke uses mocked Stripe SDK operations and locally signed webhook fixtures, so it is offline. Hosted test Checkout is a separate manual check that needs a Stripe sandbox account. Run `npm run typecheck`, `npm test`, and `npm run build` before the demo; do not claim a live integration was exercised solely because fixture tests passed.

## 3. Stay curious: stories that are true

Pick one or two and tell them as assumption, what we tried, what we changed.

- **"Four slices built separately will fit together."** We ran the merged app end to end and found they did not: For You ignored the area chosen in onboarding, My Events never showed events you joined, and two features used the same CSS prefix so one broke the other's layout. We now share one events store, pass the profile's area, radius and interests into discovery, and gave the profile styles their own prefix.
- **"Show people where others are."** We chose to publish only a neighbourhood name and to ask for an age range instead of a birth date. "Use my location" keeps the nearest area and discards the coordinates. The trade-off is less precise distance estimates.
- **"Reports should lower a trust score straight away."** We decided a report on its own changes nothing until a moderator reviews it, because automatic penalties can be abused to target someone. Reports and endorsements are stored separately.
- **AI planner limits.** Fill this in from the table in section 1 once you have run it live.

## 4. Users first: get evidence today

The deck has a persona and a WHO citation but no evidence from real people. Five short conversations at the event would fix that.

**To do: ask five people, two minutes each.**

1. When did you last want to do something but had nobody to go with? What happened?
2. How do you find things to do locally now? What is annoying about it?
3. Would you turn up to a small event with strangers who share an interest? What would stop you?
4. What would you need to know about the other people to feel comfortable going?
5. Would you rather see events on a map or as a list picked for you?

Write down one direct quote per person and count how many said yes to question 3. Put the count and the best two quotes on a slide. Say who they were (for example "five students at HackUCD"); do not present it as more than it is.

**How we reach users:** be ready with one concrete channel, such as UCD societies and sports clubs listing their open sessions.

## 5. Craft and beauty: one coherent experience

- **Done:** new logo in the header; cream, plum, blue, red and yellow across the shell, planner, Profile, My Events and onboarding.
- **Done:** For You and Map use the profile's area, travel radius and interests.
- **Done:** events you join or create appear in My Events, and its buttons open the event page and group chat.
- **Check before presenting:** the current discovery/event screens, business draft/payment states, Ask ThirdPlace provider labels, promoted feed/map labels, and deployed URL if available.
- **Known limits to say out loud:** seeded data is synthetic, accounts and ID verification are demos, and the API's git-ignored JSON storage supports one process. Profiles, events, sandbox orders, promotions, and aggregate counters survive an API restart when the same file remains available; ephemeral hosting does not guarantee durability. `THIRDPLACE_DATA_FILE=:memory:` is disposable mode. Payments are sandbox-only, and live AI/provider availability needs a configured manual check.
