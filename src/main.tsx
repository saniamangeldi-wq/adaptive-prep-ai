import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./i18n";
import "./index.css";
import "katex/dist/katex.min.css";
import { registerAppServiceWorker } from "./lib/pwa";

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <App />
      </ThemeProvider>
    </HelmetProvider>,
  );

  void registerAppServiceWorker();
}
