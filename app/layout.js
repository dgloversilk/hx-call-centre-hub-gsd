import "./globals.css";
import Providers from "@/components/auth/Providers";

export const metadata = {
  title: "GSD — Holiday Extras",
  description: "Get Stuff Done · Task management for the Holiday Extras call centre",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
