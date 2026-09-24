# petalprogress-app

Logged-in app experience for PetalProgress. Built with Vite + React + TypeScript.

## Pages

**What's live:** only the prompted journal texts (`/texts/*`). Production builds
serve just those pages; everything else redirects to `/texts`. See
[Launch surfaces](#launch-surfaces).

| Route | Page |
|-------|------|
| `/texts` | Texts sign-up: welcome → how often (2, 3, 4 or 6 a week) + time → pricing → phone + text code → review → Stripe |
| `/texts/welcome` | After payment: "Reply YES to start" (Stripe success URL) |
| `/texts/signin` | Returning subscribers: sign in with a texted code (no password) |
| `/texts/account` | Your texts: frequency, time of day, pause/resume, billing & cancel |
| `/mandala` | Mandala dashboard — SVG canvas, toolbar, settings panel, check-in |
| `/gallery` | Gallery — mandala card grid with filter tabs |
| `/calendar` | Calendar — month grid with check-in dots |
| `/onboarding` | Onboarding — 5-step habit setup with live mandala preview |
| `/onboarding/referral` | Referral onboarding — read-only variant for coach-assigned habits |
| `/admin/members` | Admin members — data table, coach marks, org modal |
| `/admin/habits` | Admin habits — habit card list with member pills |
| `/admin/insights` | Admin insights — stats, at-risk/completion tables |

## Setup

```bash
npm install
npm run dev      # starts dev server (default: http://localhost:5173)
npm run build    # production build → dist/
```

## Launch surfaces

The app ships one of two route sets, chosen at build time in `vite.config.ts`:

| Surface | Routes file | Default for |
|---|---|---|
| `texts` | `src/routes.texts.tsx` (texts pages only) | `npm run build` (production) |
| `full` | `src/routes.tsx` (every page, including unlaunched ones) | `npm run dev` |

Override with `VITE_APP_SURFACE=texts|full`. The texts surface doesn't import
the mandala pages at all, so they aren't in the bundle and the build skips the
mandala asset fetch. When more of the app launches, add its routes to
`routes.texts.tsx` (or switch production to `full`).

## Prompted journal texts

Settings the flow shows (price, prompt count, frequency notes, send days, time
windows, consent wording) are in `src/texts/config.ts`. All backend calls are in
`src/texts/api.ts`.

**Demo mode:** `VITE_TEXTS_DEMO=true` runs the whole flow with no Supabase,
Stripe or Twilio. Any 6-digit code works and "payment" goes straight to
`/texts/welcome`.

**Live mode** needs:

- **Supabase phone auth** enabled with Twilio as the SMS provider (text-code
  sign-in; the phone number is the account).
- **`petalprogress-sms` endpoints** at `VITE_TEXTS_API_URL`, each taking the
  user's Supabase access token as `Authorization: Bearer …`:

  | Endpoint | Body | Returns | Does |
  |---|---|---|---|
  | `POST /checkout` | `texts_per_week, send_hour, timezone, consent_version, consent_text, source, success_url, cancel_url` | `{ url }` | Creates a Stripe Checkout Session (`client_reference_id` = user id, choices in metadata). The Stripe webhook then creates the `sms_subscribers` row and sends "Reply YES". |
  | `POST /preferences` | `texts_per_week, send_hour, timezone` | 2xx | Updates the subscriber row. |
  | `POST /pause`, `POST /resume` | none | 2xx | Sets `subscription_status`. |
  | `POST /billing-portal` | `return_url` | `{ url }` | Stripe Billing Portal session (card, receipts, cancel). |

- **`petalprogress-db`**: a `texts_per_week` column on `sms_subscribers`, and
  somewhere to store `consent_version` / `consent_text`.
- **Which days** each person gets a prompt is decided by the texts service, not
  the app. The app never shows or asks for days, only how many a week and a
  time of day.

## Project structure

```
src/
  main.tsx                  # entry point
  routes.tsx                # React Router route definitions
  App.css                   # global resets
  layout/
    AppLayout.tsx           # app nav (Mandala/Gallery/Calendar) + sage avatar
    AdminLayout.tsx         # admin nav (Members/Habits/Insights) + amber "Teams" badge
    OnboardingLayout.tsx    # minimal topbar with disabled nav tabs
    AvatarDropdown.tsx      # shared avatar button with dropdown menu
  components/
    MandalaRing.tsx         # SVG ring builder (shared)
    MiniMandalaSvg.tsx      # gallery card mandala previews
    FilterTabs.tsx          # tab bar for gallery filter
    StatsStrip.tsx          # stat chip row
    Pagination.tsx          # table pagination
  pages/
    mandala/                # MandalaPage, Toolbar, SettingsPanel, RightPanel, MiniCalendar
    gallery/                # GalleryPage
    calendar/               # CalendarPage
    onboarding/             # OnboardingPage, OnboardingReferralPage
    admin/                  # MembersPage, HabitsPage, InsightsPage, OrgNameModal
```

## Three layouts

The app has three distinct navigation layouts:

- **AppLayout** — for regular users (Mandala, Gallery, Calendar tabs, sage-colored avatar)
- **AdminLayout** — for team admins (Members, Habits, Insights tabs, amber "Teams" badge)
- **OnboardingLayout** — for first-time setup (disabled nav tabs, no dropdown)

## Mandala assets

The mandala requires shared assets (SVG shapes, fonts, styles, themes) that live in a separate repo. A fetch script pulls them into `src/mandala/assets/` before the app runs.

**Local dev** — copies from the sibling `mandala-generator` repo:

```bash
ASSETS_SOURCE=local npm run fetch-assets
```

**CI / production** — syncs from S3 (configure via env vars):

```bash
ASSETS_S3_BUCKET=your-bucket  ASSETS_S3_REGION=us-east-1  npm run fetch-assets
```

`npm run dev` automatically fetches from local. `npm run build` runs the fetch as a prebuild step (defaults to S3).

| Env var | Description | Default |
|---------|-------------|---------|
| `ASSETS_SOURCE` | `local` or `s3` | `s3` |
| `ASSETS_S3_BUCKET` | S3 bucket name | — |
| `ASSETS_S3_PREFIX` | Key prefix in bucket | `mandala-assets/` |
| `ASSETS_S3_REGION` | AWS region | `us-east-1` |

For local dev, clone `mandala-generator` as a sibling directory so the path `../mandala-generator/my-assets/` resolves.

## Dependencies

- **@petalprogress/ui** — shared design tokens and components (linked locally via `file:../petalprogress-ui`)
- **react-router** — client-side routing

## Working with the UI package

This project imports `@petalprogress/ui` as a local file dependency. If you make changes to the UI package:

1. Rebuild it: `cd ../petalprogress-ui && npm run build`
2. Restart this dev server: `npm run dev`

Vite caches resolved dependencies, so a restart is needed to pick up UI package changes.

## Tech stack

- Vite
- React 19
- TypeScript
- React Router v7
- CSS Modules + CSS custom properties (`--pp-*` tokens from UI package)
