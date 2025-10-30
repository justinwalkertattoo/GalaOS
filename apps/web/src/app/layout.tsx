import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import HelpFab from '@/components/help/HelpFab';

export const metadata: Metadata = {
  title: 'GalaOS - Your AI Operating System',
  description: 'AI-powered operating system for unifying apps, software and services',
};

// Force dynamic rendering to avoid prerendering client pages using React Query/tRPC
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <HelpFab />
        </Providers>
      </body>
    </html>
  );
}
