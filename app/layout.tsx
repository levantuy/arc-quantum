
import type { Metadata } from 'next';
import './globals.css';

import Navbar from '../components/ui/Navbar';

export const metadata: Metadata = {
  title: 'Arc Quantum',
  description: 'Arc Quantum DeFi application on Arc Network.',
};



export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="min-h-full" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-sans bg-background text-primary dark:bg-darkbg dark:text-white transition-colors duration-300">
        <Navbar />
        <main className="flex-1 container mx-auto px-2 md:px-6 py-10 flex items-center justify-center">
          <div className="w-full max-w-7xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 min-h-[60vh] border border-blue-100 dark:border-zinc-800 transition-colors duration-300">
            {children}
          </div>
        </main>
        <footer className="bg-white/80 dark:bg-zinc-900/80 border-t border-blue-100 dark:border-zinc-800 text-gray-500 dark:text-gray-400 text-sm text-center py-4 mt-8 shadow-inner rounded-t-2xl transition-colors duration-300">
          © 2026 Arc Quantum. All rights reserved.
        </footer>
      </body>
    </html>
  );
}