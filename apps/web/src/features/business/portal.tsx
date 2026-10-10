// Standalone entry for the business portal, served by Vite at
// /src/features/business/portal.html. Keeps the portal separate from the four
// main user views until it is routed from App.tsx (a coordination file).
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BusinessPortal } from "./BusinessPortal";
import "../../styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BusinessPortal />
  </StrictMode>
);
