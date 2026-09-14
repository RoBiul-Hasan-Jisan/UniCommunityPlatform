import "./globals.css";
import { AuthProvider } from "../lib/AuthContext";

export const metadata = {
  title: "UniConnect — University Student & Alumni Community",
  description: "Connect, learn, and grow with students and alumni.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
