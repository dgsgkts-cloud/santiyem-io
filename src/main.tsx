import "./debug/wsRtcTap"; // must run before any SDK constructs WS/RTC
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";

// Theme class will be applied by ThemeContext after login

createRoot(document.getElementById("root")!).render(<App />);
