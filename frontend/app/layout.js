import "./globals.css";
import { AuthProvider } from "../lib/AuthContext";
import { LanguageProvider } from "../lib/i18n";
import PwaSetup from "../components/PwaSetup";

export const metadata = {
  title: "UniConnect — University Student & Alumni Community",
  description: "Connect, learn, and grow with students and alumni.",
  applicationName: "UniConnect",
  appleWebApp: { capable: true, title: "UniConnect", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#12192B",
  width: "device-width",
  initialScale: 1,
};

// Runs before first paint so the saved (or OS-preferred) theme applies with no flash.
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
        <PwaSetup />
      </body>
    </html>
  );
}
