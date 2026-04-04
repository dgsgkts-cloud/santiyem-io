import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Theme class will be applied by ThemeContext after login

createRoot(document.getElementById("root")!).render(<App />);
