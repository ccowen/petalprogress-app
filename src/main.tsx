import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
// "@app/routes" is src/routes.tsx or src/routes.texts.tsx, chosen in vite.config.ts
import { router } from "@app/routes";
import "@petalprogress/ui/styles.css";
import "./App.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
