import type { ReactNode } from 'react';

type SectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function Section({
  eyebrow,
  title,
  description,
  children,
  className = '',
  contentClassName = '',
}: SectionProps) {
  return (
    <section className={`w-full ${className}`.trim()}>
      <div className="mb-6 flex flex-col gap-3 text-center sm:mb-8">
        {eyebrow ? (
          <span className="mx-auto inline-flex rounded-full border border-sky-200/80 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
            {eyebrow}
          </span>
        ) : null}
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="mx-auto max-w-3xl text-base leading-7 text-gray-600 dark:text-gray-400 sm:text-lg">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}