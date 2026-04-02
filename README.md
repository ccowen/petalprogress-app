# petalprogress-app

Logged-in app experience for PetalProgress. Built with Vite + React + TypeScript.

## Pages

| Route | Page |
|-------|------|
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
