import { createBrowserRouter, Navigate } from "react-router";
import RequireAuth from "./components/RequireAuth.tsx";
import SignInPage from "./pages/SignInPage.tsx";
import AppLayout from "./layout/AppLayout.tsx";
import AdminLayout from "./layout/AdminLayout.tsx";
import OnboardingLayout from "./layout/OnboardingLayout.tsx";
import GalleryPage from "./pages/gallery/GalleryPage.tsx";
import CalendarPage from "./pages/calendar/CalendarPage.tsx";
import HabitsPage from "./pages/admin/HabitsPage.tsx";
import MembersPage from "./pages/admin/MembersPage.tsx";
import InsightsPage from "./pages/admin/InsightsPage.tsx";
import OnboardingPage from "./pages/onboarding/OnboardingPage.tsx";
import OnboardingReferralPage from "./pages/onboarding/OnboardingReferralPage.tsx";
import { MandalaPage } from "./pages/mandala";

export const router = createBrowserRouter([
  { path: "signin", element: <SignInPage /> },
  {
    element: (
      <RequireAuth>
        <OnboardingLayout />
      </RequireAuth>
    ),
    children: [
      { path: "onboarding", element: <OnboardingPage /> },
      { path: "onboarding/referral", element: <OnboardingReferralPage /> },
    ],
  },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/mandala" replace /> },
      { path: "mandala", element: <MandalaPage /> },
      { path: "gallery", element: <GalleryPage /> },
      { path: "calendar", element: <CalendarPage /> },
    ],
  },
  {
    path: "admin",
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/members" replace /> },
      { path: "members", element: <MembersPage /> },
      { path: "habits", element: <HabitsPage /> },
      { path: "insights", element: <InsightsPage /> },
    ],
  },
]);
