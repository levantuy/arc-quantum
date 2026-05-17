import type { Metadata } from 'next';
import './globals.css';


import Navbar from '../components/ui/Navbar';
import { ToastProvider } from '../components/ui/Toast';

export const metadata: Metadata = {
  title: 'Arc Quantum',
  description: 'Arc Quantum DeFi application on Arc Network.',
};



export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="min-h-dvh" suppressHydrationWarning>
      <body className="min-h-dvh flex flex-col font-sans transition-colors duration-300">
        <ToastProvider>
          <Navbar />
          <main className="flex-1 container mx-auto px-3 md:px-6 pb-20 flex items-center justify-center transition-colors duration-300">
            <div className="app-surface w-full max-w-7xl p-8 md:p-10 min-h-[60vh] transition-colors duration-300">
              {children}
            </div>
          </main>
          <footer className="app-footer fixed bottom-0 inset-x-0 z-30 text-sm text-center py-4 transition-colors duration-300">
            © 2026 Arc Quantum. All rights reserved.
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}