import Link from 'next/link';

const modules = [  
  {
    name: 'Balance',
    href: '/balance',
    icon: (
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="3" fill="#0891b2" opacity="0.12"/><rect x="7" y="11" width="10" height="2" rx="1" fill="#0891b2"/></svg>
    ),
    desc: 'View your wallet balances across supported tokens.'
  },
  {
    name: 'Bridge',
    href: '/bridge',
    icon: (
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path d="M5 17V7m14 10V7" stroke="#0891b2" strokeWidth="2" strokeLinecap="round"/><rect x="7" y="11" width="10" height="2" rx="1" fill="#0891b2"/></svg>
    ),
    desc: 'Transfer tokens between different blockchain networks.'
  },
  {
    name: 'History',
    href: '/history',
    icon: (
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#0891b2" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="#0891b2" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
    desc: 'Track all your transactions in one place.'
  },
  {
    name: 'Send',
    href: '/send',
    icon: (
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path d="M4 12h16M14 6l6 6-6 6" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    desc: 'Send ARC or ERC20 tokens to another wallet.'
  },
  {
    name: 'Swap',
    href: '/swap',
    icon: (
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path d="M7 10V6a2 2 0 0 1 2-2h6m2 10v4a2 2 0 0 1-2 2H7m10-6-4 4m0 0-4-4" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    desc: 'Swap between supported tokens instantly.'
  },
  {
    name: 'About',
    href: '/about',
    icon: (
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#0891b2" strokeWidth="2"/><path d="M12 8h.01" stroke="#0891b2" strokeWidth="2" strokeLinecap="round"/><path d="M11 12h1v4h1" stroke="#0891b2" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
    desc: 'Learn more about Arc Quantum and its mission.'
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center py-12">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">Arc Quantum</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl text-center mb-8">
        Arc Quantum is a modern DeFi application on Arc Network, providing seamless asset management, cross-chain transfers, and token swaps. Explore the modules below to get started.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {modules.map((mod) => (
          <Link key={mod.name} href={mod.href} className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 p-6 flex flex-col items-center shadow-sm hover:shadow-md transition hover:border-sky-400 dark:hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400">
            <div className="mb-3">{mod.icon}</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 mb-1">{mod.name}</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm text-center">{mod.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}