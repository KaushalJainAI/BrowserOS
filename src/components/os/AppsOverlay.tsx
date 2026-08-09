/** Full-screen application launcher, grouped by category. */

import { useMemo, useState } from 'react';
import { X, Search, Pin, PinOff, MonitorUp } from 'lucide-react';
import { useOSActions, useOSShell, useOSWindows } from '../../contexts/osState';
import { CATEGORY_LABELS, searchApps, type AppCategory, type AppMeta } from '../../os/apps';

/**
 * The launcher only exists while it is open.
 *
 * Mounting on demand is what makes the search field start empty every time
 * without an effect reaching in to clear it — closing the launcher unmounts
 * its state, which is exactly the intended lifetime.
 */
export function AppsOverlay() {
  const { overlay } = useOSShell();
  return overlay === 'apps' ? <Launcher /> : null;
}

function Launcher() {
  const { setOverlay, openApp, showContextMenu, addToDesktop, pinApp, unpinApp } = useOSActions();
  const { windows } = useOSWindows();
  const { pinnedApps } = useOSShell();
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const matches = searchApps(query);
    const buckets = new Map<AppCategory, AppMeta[]>();
    for (const app of matches) {
      const list = buckets.get(app.category) ?? [];
      list.push(app);
      buckets.set(app.category, list);
    }
    // Fixed category order keeps the grid stable as the query narrows.
    return (Object.keys(CATEGORY_LABELS) as AppCategory[])
      .map((category) => [category, buckets.get(category) ?? []] as const)
      .filter(([, list]) => list.length > 0);
  }, [query]);

  const close = () => setOverlay(null);
  const total = grouped.reduce((sum, [, list]) => sum + list.length, 0);

  return (
    <div className="fixed inset-0 z-[30000] flex flex-col os-anim-fade" onClick={close}>
      <div className="absolute inset-0 bg-[var(--os-bg)]/92 backdrop-blur-2xl" />

      <div className="relative flex flex-col h-full" onClick={(event) => event.stopPropagation()}>
        <div className="pt-14 pb-8 px-6 flex flex-col items-center shrink-0">
          <div className="w-full max-w-xl flex items-center gap-3 px-4 h-12 rounded-2xl bg-[var(--os-surface)] border border-[var(--os-border)] focus-within:border-[var(--os-accent)] transition-colors">
            <Search size={18} className="text-[var(--os-text-dim)]" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') close();
                if (event.key === 'Enter' && grouped[0]?.[1][0]) {
                  openApp(grouped[0][1][0].id);
                  close();
                }
              }}
              placeholder="Search applications…"
              aria-label="Search applications"
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-[var(--os-text)] placeholder:text-[var(--os-text-dim)]"
            />
            {query && (
              <button onClick={() => setQuery('')} className="os-icon-button" aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={close}
          className="absolute top-6 right-6 os-icon-button w-10 h-10"
          aria-label="Close launcher"
        >
          <X size={22} />
        </button>

        <div className="flex-1 overflow-y-auto px-8 pb-24">
          <div className="max-w-6xl mx-auto space-y-9">
            {total === 0 && (
              <p className="text-center text-[var(--os-text-dim)] pt-16 text-[15px]">
                No applications match “{query}”
              </p>
            )}

            {grouped.map(([category, list]) => (
              <section key={category}>
                <h2 className="os-field-label mb-3 px-1">{CATEGORY_LABELS[category]}</h2>
                <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(158px,1fr))]">
                  {list.map((app) => {
                    const Icon = app.icon;
                    const isPinned = pinnedApps.includes(app.id);
                    const running = windows.some((entry) => entry.appId === app.id);
                    return (
                      <button
                        key={app.id}
                        onClick={() => { openApp(app.id); close(); }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          showContextMenu(event, [
                            { label: 'Open', onClick: () => { openApp(app.id); close(); } },
                            ...(app.multiInstance
                              ? [{ label: 'Open in new window', onClick: () => { openApp(app.id, { forceNew: true }); close(); } }]
                              : []),
                            {
                              label: isPinned ? 'Unpin from dock' : 'Pin to dock',
                              icon: isPinned ? PinOff : Pin,
                              divider: true,
                              onClick: () => (isPinned ? unpinApp(app.id) : pinApp(app.id)),
                            },
                            { label: 'Add to desktop', icon: MonitorUp, onClick: () => addToDesktop(app.id) },
                          ]);
                        }}
                        className="group flex flex-col items-start gap-3 p-3.5 rounded-2xl border border-[var(--os-border)] bg-[var(--os-surface)] hover:border-[var(--os-border-strong)] hover:bg-[var(--os-surface-raised)] transition-all text-left"
                        aria-label={`${app.title}: ${app.description}`}
                      >
                        <span className="flex items-center gap-2 w-full">
                          <span className={`w-11 h-11 rounded-xl bg-linear-to-br ${app.tint} flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-105 transition-transform`}>
                            <Icon size={22} strokeWidth={1.9} />
                          </span>
                          {running && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--os-success)]" title="Running" />
                          )}
                        </span>
                        <span className="min-w-0 w-full">
                          <span className="block text-[13px] font-semibold text-[var(--os-text)] truncate">
                            {app.title}
                          </span>
                          <span className="block text-[11px] leading-snug text-[var(--os-text-dim)] line-clamp-2 mt-0.5">
                            {app.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
