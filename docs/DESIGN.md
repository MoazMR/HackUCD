# Web design direction

Build a distinctive ThirdPlace web experience inspired by the clarity, confidence, and locality of Manna, Once Upon, and Deliveroo. Do not copy their branding, copy, layouts, imagery, or proprietary assets.

## Principles

- **Location first:** put the chosen area, travel radius, map, and nearby events at the centre of discovery, as a delivery-style postcode/location experience does.
- **Warm and editorial:** use generous whitespace, bold short headlines, large photography or illustration areas, and carefully composed feature cards rather than dense dashboard UI.
- **Fast to scan:** use Deliveroo-like category chips, clear filter states, event thumbnails, price/free labels, and obvious calls to action.
- **Trust visible, not intrusive:** show verified status, endorsement count, event host, and public-chat rules as calm, legible status indicators. Never place sensitive personal data or ID details in the public UI.
- **One visual system:** rounded cards, restrained shadows, a light neutral base, high-contrast dark text, and an original teal/green accent palette. Meet accessible contrast and keyboard-focus requirements.

## Required screens

ThirdPlace has exactly four main user destinations. The navigation must make them obvious on desktop and mobile. “Create event” is a persistent primary action, not a fifth destination.

1. **For You:** the default feed of recommended nearby events. It includes search and filters, curated event cards, and a prominent Create Event button at the right of the desktop layout (or a fixed primary action on mobile).
2. **Map:** the user's approximate location plus interactive event hotspots. Selecting a hotspot opens a compact event preview and route into the full event. The map always has an equivalent accessible list/feed view.
3. **My Events:** upcoming and past events the user joined or created. Each event opens its details and its public event-group chat. Past events support the profile privacy setting for showing or hiding attendance history.
4. **Profile:** public-safe profile summary, photo, editable name, approximate location, settings, interests, travel radius, privacy controls, verification status, and endorsement/trust signal.

Supporting routes may include the event detail, create-event flow, onboarding, and business portal, but they must always lead naturally back to one of the four destinations.

## Avoid

- Copying any reference site's logo, words, photos, iconography, exact CSS, or layout.
- A generic dark admin dashboard aesthetic.
- Huge map sections without accessible feed/list alternatives.
- UI that implies private messaging, automatic safety guarantees, or real ID-document storage.
