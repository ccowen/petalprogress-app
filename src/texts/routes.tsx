import type { RouteObject } from "react-router";
import TextsSignupPage from "../pages/texts/TextsSignupPage";
import TextsSignInPage from "../pages/texts/TextsSignInPage";
import TextsWelcomePage from "../pages/texts/TextsWelcomePage";
import TextsAccountPage from "../pages/texts/TextsAccountPage";

/**
 * Prompted journal texts. Public (no RequireAuth): the account page checks
 * for a session itself, so the flow never loads Supabase in demo mode.
 * Shared by both surfaces — see src/routes.texts.tsx.
 */
export const textsRoutes: RouteObject[] = [
  { path: "texts", element: <TextsSignupPage /> },
  { path: "texts/signin", element: <TextsSignInPage /> },
  { path: "texts/welcome", element: <TextsWelcomePage /> },
  { path: "texts/account", element: <TextsAccountPage /> },
];
