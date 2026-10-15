import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cognitive Intelligence Test 9.0 | ISTE NIT Durgapur',
  description: 'National Level Technical Assessment Platform engineered by ISTE NIT Durgapur.',
  icons: {
    icon: '/favicon.ico',
  },
};

import { AuthProvider } from '../lib/auth-context';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" className="dark">
      <body className="bg-cit-dark text-slate-100 antialiased selection:bg-pink-500 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
