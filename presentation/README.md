# ThirdPlace pitch presentation

This is a dependency-free HTML presentation for the HackUCD pitch. It uses synthetic people, events, venues, campaign metrics, and illustrative pricing.

## Present locally

From the repository root:

```powershell
npx serve presentation
```

Open the printed local URL. Use the on-screen controls or:

- `←` / `→` or Page Up / Page Down to navigate
- Space to advance when an interactive control is not focused
- `F` for fullscreen
- `N` to toggle presenter notes where supplied
- Home / End to jump to the first or final slide

The deck links its loneliness claim to the WHO Commission on Social Connection. Pricing is explicitly presented as an illustrative hackathon hypothesis.

## Live slides and things to fill in before presenting

- **Slides 11 and 12 call the running API** (`npm run dev`, API on `http://localhost:3001`). Slide 11 generates a plan through OpenRouter and shows whether it came from OpenRouter or the placeholder. Slide 12 shows Stripe test-mode status and the recorded orders. If the API is not running they say so instead of showing anything made up. Use `?api=http://host:port` and `?web=http://host:port` to point the deck elsewhere.
- **Slide 3 has three quote cards** (dashed outline) to replace with real survey quotes. Delete the `todo` class on each when done.
- Prices on slide 10 match the app (`apps/api/src/services/promotions.ts`). Change both if you change one.
