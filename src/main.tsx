// Dev-only WS/RTC diagnostic tap — prod build skips it (must run before any SDK constructs WS/RTC).
if (import.meta.env.DEV) {
  import("./debug/wsRtcTap");
}


import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/design-system.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import { migrateVoiceProviderStorage } from "./lib/voice/voiceConfig";

// One-time cleanup of the obsolete voice-provider preference so stale
// browser data can never influence the voice transport.
migrateVoiceProviderStorage();

// Theme class will be applied by ThemeContext after login

createRoot(document.getElementById("root")!).render(<App />);
