import Link from 'next/link';

import { Section } from '@/components/ui/Section';

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

const featuredProjects = [
  {
    name: 'Arc Auto Trade',
    href: 'https://arc-auto-trade-web.vercel.app/',
    category: 'Trading Automation',
    description: 'Automate strategy execution with a streamlined workflow for active Arc participants.',
  },
  {
    name: 'Arc Network',
    href: 'https://arc-quantum.vercel.app/balance',
    category: 'Wallet Operations',
    description: 'Monitor balances and access the core Arc Quantum experience from a single entry point.',
  },
  {
    name: 'GT Market',
    href: 'https://gt-market.vercel.app/vi',
    category: 'NFT Marketplace',
    description: 'Explore, list, and trade NFT assets in a marketplace tuned for collector flows.',
  },
  {
    name: 'Arc Pay',
    href: 'https://arc-p2p-payments.vercel.app/sign-in',
    category: 'Payments',
    description: 'Run peer-to-peer payment flows with a simple onboarding path and transaction access.',
  },
  {
    name: 'Arc Fintech Starter',
    href: 'https://arc-fintech-three.vercel.app/',
    category: 'Starter Kit',
    description: 'Use a launch-ready reference app for fintech products built on Arc primitives.',
  },
  {
    name: 'Workflow Escrow',
    href: 'https://arc-escrow-phi.vercel.app/',
    category: 'Escrow Automation',
    description: 'Structure milestone-based releases with an escrow flow designed for collaborative deals.',
  },
  {
    name: 'Arc Commerce',
    href: 'https://arc-commerce-rho.vercel.app/',
    category: 'Commerce',
    description: 'Power checkout and order flows for commerce experiences anchored in Arc payments.',
  },
  {
    name: 'Multichain Gateway Wallet',
    href: 'https://arc-multichain-wallet.vercel.app/',
    category: 'Multichain Wallet',
    description: 'Manage funds across chains with a wallet experience built for gateway-style transfers.',
  },
  {
    name: 'My Day',
    href: 'https://import-day-web.vercel.app/login',
    category: 'Productivity',
    description: 'Track daily execution in a compact workspace that complements broader Arc operations.',
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex flex-col items-center py-12">
      <Section
        eyebrow="Arc Quantum"
        title="DeFi workflows and Arc ecosystem access in one place"
        description="Arc Quantum is a modern DeFi application on Arc Network, providing seamless asset management, cross-chain transfers, and token swaps. Explore the modules below to get started."
        className="max-w-5xl"
        contentClassName="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3"
      >
        {modules.map((mod) => (
          <Link
            key={mod.name}
            href={mod.href}
            className="group rounded-2xl border border-gray-200/90 bg-white/90 p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-gray-700 dark:bg-slate-900/90 dark:hover:border-sky-500"
          >
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 ring-1 ring-sky-100 dark:bg-sky-950/40 dark:ring-sky-900/70">
              {mod.icon}
            </div>
            <div className="mb-1 text-xl font-semibold text-gray-900 transition group-hover:text-sky-600 dark:text-gray-100 dark:group-hover:text-sky-400">
              {mod.name}
            </div>
            <div className="text-sm leading-6 text-gray-500 dark:text-gray-400">{mod.desc}</div>
          </Link>
        ))}
      </Section>

      <Section
        eyebrow="Featured Projects"
        title="Discover the broader Arc ecosystem"
        description="A curated set of Arc-native products and companion apps that extend trading, payments, commerce, wallet, and operations use cases beyond the core Arc Quantum modules."
        className="mt-16 max-w-6xl"
        contentClassName="grid grid-cols-1 gap-5 lg:grid-cols-2"
      >
        {featuredProjects.map((project, index) => (
          <Link
            key={project.name}
            href={project.href}
            target="_blank"
            rel="noreferrer"
            className="group relative overflow-hidden rounded-2xl border border-gray-200/90 bg-white/90 p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-gray-700 dark:bg-slate-900/90 dark:hover:border-sky-500"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 opacity-70" />
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
                  {project.category}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 transition group-hover:text-sky-600 dark:text-gray-100 dark:group-hover:text-sky-400">
                    {project.name}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                    {project.description}
                  </p>
                </div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-sm font-semibold text-gray-600 transition group-hover:bg-sky-100 group-hover:text-sky-700 dark:bg-slate-800 dark:text-gray-300 dark:group-hover:bg-sky-950/60 dark:group-hover:text-sky-300">
                {(index + 1).toString().padStart(2, '0')}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <span>Open project</span>
              <span className="font-medium text-sky-700 transition group-hover:translate-x-1 dark:text-sky-300">
                Visit site →
              </span>
            </div>
          </Link>
        ))}
      </Section>
    </div>
  );
}