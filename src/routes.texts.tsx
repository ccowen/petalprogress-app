import { createBrowserRouter, Navigate } from "react-router";
import { textsRoutes } from "./texts/routes";

/**
 * The "texts" surface: what production serves while the texts are the only
 * live product. Nothing else is imported, so the mandala, gallery, calendar,
 * admin and habit onboarding pages aren't in the bundle at all, and the build
 * doesn't need the mandala assets.
 *
 * Which router is used is decided in vite.config.ts (VITE_APP_SURFACE).
 */
export const router = createBrowserRouter([
  ...textsRoutes,
  { path: "signin", element: <Navigate to="/texts/signin" replace /> },
  { path: "*", element: <Navigate to="/texts" replace /> },
]);
