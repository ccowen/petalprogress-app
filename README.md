# petalprogress-app

Logged-in app experience for PetalProgress. Built with Vite + React + TypeScript.

## Pages

**What's live:** only the prompted journal texts (`/guided-journal/*`). Production builds
serve just those pages: the root (`/`) goes to `/guided-journal/signin`, and any other
unknown path goes to `/guided-journal`. See [Launch surfaces](#launch-surfaces).

| Route | Page |
|-------|------|
| `/guided-journal` | Texts sign-up: welcome → how often (2, 3, 4 or 6 a week) + time → pricing → review → Stripe |
| `/guided-journal/welcome` | After payment (Stripe success URL): your signature → your number + consent → "Reply YES to start". The YES reply triggers the first prompt immediately; later prompts follow the chosen rhythm. |
| `/guided-journal/signin` | Returning subscribers: sign in with a texted code (no password) |
| `/guided-journal/account` | Your texts: frequency, time of day, pause/resume, billing & cancel |
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

| Surface | Routes file | When |
|---|---|---|
| `texts` | `src/routes.texts.tsx` (guided-journal pages only) | **Default**, for both `npm run dev` and `npm run build` |
| `full` | `src/routes.tsx` (adds the hidden mandala, gallery, calendar, admin pages) | Only when asked: `VITE_APP_SURFACE=full npm run dev` |

The mandala app isn't launched, so it's hidden everywhere unless you opt in.
Dev therefore behaves like production: the root goes to sign-in and only the
guided-journal pages exist. The texts surface doesn't import the mandala pages
at all, so they aren't in the bundle and the asset fetch is skipped. When more
of the app launches, add its routes to `routes.texts.tsx` (or switch the
default to `full` in `vite.config.ts` and `scripts/fetch-assets.js`).

## Prompted journal texts

Settings the flow shows (price, prompt count, frequency notes, send days, time
windows, consent wording) are in `src/texts/config.ts`. All backend calls are in
`src/texts/api.ts`.

**Demo mode:** `VITE_TEXTS_DEMO=true` runs the whole flow with no Supabase,
Stripe or Twilio. "Payment" goes straight to `/guided-journal/welcome`, and
any 6-digit code signs you in.

**Payment before any text.** The phone number is asked for *after* Stripe
Checkout, on the success page, together with the consent checkbox, and the
"Reply YES" text goes out the moment it's entered. So typing a number always
produces a text, the first text a number ever receives is to a paid session,
and that YES reply is both the proof the number is theirs and the double
opt-in. Sign-in still texts a code, but only to numbers that already have an
account, so neither form can be used to pump texts at arbitrary numbers.

**Live mode** needs:

- **Supabase phone auth** enabled with Twilio as the SMS provider, for
  text-code sign-in only (the phone number is the account). Sign-up with
  `shouldCreateUser` is never called; the texts service creates the auth user
  (admin API) from the Stripe webhook.
- **`petalprogress-sms` endpoints** at `VITE_TEXTS_API_URL`. The first two run
  before an account exists and are unauthenticated; the rest take the user's
  Supabase access token as `Authorization: Bearer …`:

  | Endpoint | Body | Returns | Does |
  |---|---|---|---|
  | `POST /checkout` | `texts_per_week, send_hours, timezone, source, success_url, cancel_url` | `{ url }` | Creates a Stripe Checkout Session with the choices in metadata. `success_url` contains the literal `{CHECKOUT_SESSION_ID}` for Stripe to fill in. Rate-limit by IP; it sends no texts but does create Checkout Sessions. |
  | `POST /claim` | `session_id, phone, display_name, consent_version, consent_text` | `{ display_name }` | Called from the success page. Verify the Checkout Session is paid and not yet confirmed by YES; create the auth user (admin API) and the `sms_subscribers` row from the session metadata; store the consent record and `display_name`; send "Reply YES". **Signatures are unique** (unique index on `display_name`): if the requested one is taken, keep the words and pick a different 2-digit number (retry on conflict) and return the name actually stored; the app shows that. Idempotent per session: calling again with a different number before the YES updates the number and resends. Rate-limit per session (a few tries) so a session id can't drive many texts. |
  | `POST /resend-claim-link` | `email` | 2xx | Unauthenticated, from the sign-in page. Find paid, *unclaimed* Checkout Sessions with this customer email and email the finish link (`/guided-journal/welcome?session_id=…`). Always return 2xx with no detail, found or not, so it can't be used to test who has paid. Rate-limit by IP and by email (one send per few minutes). Sends email only, never texts. |
  | `POST /claim-status` | `session_id` | `{ claimed, phone?, display_name? }` | Unauthenticated. Lets the welcome page resume at "check your phone" after a reload instead of asking for the name and number again. Return only whether it's claimed plus the number and name already given by that same session. |
  | `POST /preferences` | `texts_per_week, send_hours, timezone` | 2xx | Updates the subscriber row. |
  | `POST /phone-changed` | `consent_version, consent_text` | 2xx | Called right after the app verifies a Supabase phone-change code. Read the auth user's (now new) phone, copy it onto `sms_subscribers.phone`, store a fresh consent record for it, and text the old number once: "Your PetalProgress prompts have moved to a new number." Refuse while `past_due` or cancelled. Cap at a few changes a day per account. |
  | `POST /pause`, `POST /resume` | none | 2xx | Sets `subscription_status`. |
  | `POST /billing-portal` | `return_url` | `{ url }` | Stripe Billing Portal session (card, receipts, cancel). |

- **`petalprogress-db`** migration `20261029000100_texts_signup.sql`
  (`texts_per_week`, `paused_at`, consent record, `sms_messages`), plus a
  `sms_subscribers.display_name text` column for the signature, with a
  **unique index** (`src/texts/names.ts` generates it, e.g. `Gentle_Heron_42`;
  the texts service puts it at the bottom of the mandala images and resolves
  clashes at claim time). It's chosen once at sign-up and not editable
  afterwards, like Reddit's generated usernames. This app's types come from
  that repo.
- **Which days** each person gets a prompt is decided by the texts service, not
  the app. The app never shows or asks for days, only how many a week and a
  time of day.

**Paid but never claimed.** Someone can pay and close the tab before entering
a number. They then have no subscriber row and no way to sign in (sign-in is
by phone). The texts service must cover this:

1. On Stripe's `checkout.session.completed`, store the session as *paid,
   unclaimed* with the email Stripe collected, before any claim arrives.
2. Email them straight away with the link to finish:
   `/guided-journal/welcome?session_id=…` (the Stripe receipt alone doesn't
   link anywhere useful). The sign-in page also lets them ask for that email
   again (`POST /resend-claim-link`), since with no phone on file they can't
   sign in.
3. If still unclaimed after a set period (say 7 days), cancel the Stripe
   subscription and refund, so nobody keeps paying for texts they never set up.

**Changing the phone number** is on the settings page ("Change number"). It
uses Supabase's phone-change flow: the app asks to update the account's phone,
Supabase texts a code to the *new* number, and the account only switches once
that code is verified. Then the app calls `POST /phone-changed` so the texts
service syncs the subscriber row. Only a signed-in subscriber can start it and
Supabase's OTP rate limits apply, so the exposure is bounded. Consent is
collected again because the original consent named the old number. The
signature is fixed after sign-up by design.

**Cap phone-change codes per account (TODO before enabling self-serve).**
Supabase sends the phone-change code straight from the browser request, so
the texts service never sees it and can't limit it. A paying account could
therefore point codes at numbers it chooses until Supabase's *project-wide*
hourly SMS cap (default ~30) kicks in, blocking real sign-ins for that hour.
Fix: configure Supabase Auth's **Send SMS hook** to a small function that does
the sending through our Twilio account and refuses more than **3 phone-change
codes per user per day** (count by user id + OTP type). Also check the two
Auth rate-limit settings (texts per hour, cooldown between sends) are set
deliberately. Until the hook exists, keep self-serve number changes off and
handle requests by hand ("Reply HELP to any text").

**Captcha: not now, ready if needed.** No public form sends a text before
payment, claim and phone-change are gated by payment, and the email-the-link
form only emails real customers, so a captcha would add friction without
closing anything. The one place it would earn its keep is sign-in, if someone
ever pesters subscribers with codes or the "existing accounts only" setting is
loosened by mistake. If that happens: enable **Cloudflare Turnstile** under
Supabase Auth → Attack Protection, add the Turnstile widget to
`PhoneCodeForm`, and pass its token as `options.captchaToken` in
`signInWithOtp` (`src/texts/api.ts`). About half an hour.

The server side of all this lives in petalprogress-sms (`webhooks/texts_api.py`,
`webhooks/stripe_webhook.py`).

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
