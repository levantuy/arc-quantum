'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/tokens', label: 'Token Config' },
  { href: '/admin/bridge-config', label: 'Bridge Config' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="rounded border bg-white dark:bg-gray-900 dark:border-gray-700 p-3">
      <ul className="flex flex-wrap gap-2 text-sm">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== '/admin' && pathname.startsWith(`${link.href}/`));

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`inline-flex rounded px-3 py-1.5 transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
