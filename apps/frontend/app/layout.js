import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import Navbar from '@/components/layout/Navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata = {
  title: 'ClipSync — Instant Clipboard Sharing',
  description:
    'Share clipboard content instantly with a 6-digit PIN. Real-time sync across all connected devices. No account required.',
  keywords: 'clipboard, share, sync, paste, PIN, real-time',
  openGraph: {
    title: 'ClipSync — Instant Clipboard Sharing',
    description: 'Share clipboard content instantly with a 6-digit PIN.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: next-themes adds class attr on <html> client-side
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
