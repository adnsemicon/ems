import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Users } from 'lucide-react';
import { CAREER_LEVELS, CareerLevel, VisibleDailyUpdate } from '@shared/types';
import { api } from '../api';

interface DailyUpdatesResult {
  date: string;
  viewerLevel: CareerLevel;
  updates: VisibleDailyUpdate[];
}

const updateSections: Array<{ title: string; key: keyof Pick<
  VisibleDailyUpdate,
  'todaysTasks' | 'suddenTasks' | 'blockers' | 'plansGoingForward'
> }> = [
  { title: "Today's Tasks", key: 'todaysTasks' },
  { title: 'Sudden Tasks', key: 'suddenTasks' },
  { title: 'Blockers', key: 'blockers' },
  { title: 'Plans Going Forward', key: 'plansGoingForward' },
];

const getLevelNumber = (lvl: string): number => {
  const match = lvl.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

export const DailyUpdates: React.FC = () => {
  const [result, setResult] = useState<DailyUpdatesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'locked'>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'level' | 'employeeName' | 'employeeGithubUsername' | 'status'>('level');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const loadUpdates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await api.getVisibleDailyUpdates());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load daily updates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUpdates();
  }, [loadUpdates]);

  const viewerDesignation = CAREER_LEVELS.find(level => level.value === result?.viewerLevel)?.designation;

  const availableLevels = useMemo(() => {
    if (!result) return CAREER_LEVELS;
    const viewerLevelNum = parseInt(result.viewerLevel.replace(/\D/g, ''), 10) || 12;
    return CAREER_LEVELS.filter(level => {
      const num = parseInt(level.value.replace(/\D/g, ''), 10);
      return num <= viewerLevelNum || (result.updates && result.updates.some(u => u.level === level.value));
    });
  }, [result]);

  const filteredUpdates = useMemo(() => {
    if (!result?.updates) return [];
    const query = search.trim().toLowerCase();

    return result.updates
      .filter(update => {
        const designation = CAREER_LEVELS.find(lvl => lvl.value === update.level)?.designation || '';
        const matchesSearch =
          !query ||
          [
            update.employeeName,
            update.employeeGithubUsername,
            update.level,
            designation,
            ...update.todaysTasks,
            ...update.suddenTasks,
            ...update.blockers,
            ...update.plansGoingForward,
          ].some(value => value.toLowerCase().includes(query));

        const matchesStatus = statusFilter === 'all' || update.status === statusFilter;
        const matchesLevel = levelFilter === 'all' || update.level === levelFilter;

        return matchesSearch && matchesStatus && matchesLevel;
      })
      .sort((left, right) => {
        if (sortBy === 'level') {
          const leftRank = getLevelNumber(left.level);
          const rightRank = getLevelNumber(right.level);
          if (leftRank !== rightRank) {
            return sortDirection === 'asc' ? leftRank - rightRank : rightRank - leftRank;
          }
          return left.employeeName.localeCompare(right.employeeName, undefined, { sensitivity: 'base' });
        }

        if (sortBy === 'status') {
          const comparison = left.status.localeCompare(right.status, undefined, { sensitivity: 'base' });
          if (comparison !== 0) {
            return sortDirection === 'asc' ? comparison : -comparison;
          }
          return left.employeeName.localeCompare(right.employeeName, undefined, { sensitivity: 'base' });
        }

        const leftValue = left[sortBy] || '';
        const rightValue = right[sortBy] || '';
        const comparison = leftValue.localeCompare(rightValue, undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [result?.updates, search, statusFilter, levelFilter, sortBy, sortDirection]);

  return (
    <section className="space-y-5" aria-labelledby="daily-updates-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-adn-700" aria-hidden="true" />
            <h1 id="daily-updates-heading" className="text-xl font-bold text-slate-900">
              Daily Updates
            </h1>
          </div>
          {result && (
            <p className="mt-1 text-sm text-slate-500">
              {result.date} · Your level: {result.viewerLevel}
              {viewerDesignation ? ` (${viewerDesignation})` : ''}. Showing your updates and updates from lower levels.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={loadUpdates}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading daily updates...
        </div>
      ) : !error && result?.updates.length === 0 ? (
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No daily updates are available for you or employees at lower levels today.
        </p>
      ) : !error && result ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3">
            <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
                Search daily updates
                <input
                  type="search"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Employee or update text"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-800"
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
                Update status
                <select
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-800"
                >
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="locked">Locked</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
                Career level
                <select
                  value={levelFilter}
                  onChange={event => setLevelFilter(event.target.value)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-800"
                >
                  <option value="all">All levels</option>
                  {availableLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.value} · {level.designation}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
                Sort by
                <select
                  value={sortBy}
                  onChange={event => setSortBy(event.target.value as typeof sortBy)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-800"
                >
                  <option value="level">Career level</option>
                  <option value="employeeName">Employee name</option>
                  <option value="employeeGithubUsername">GitHub username</option>
                  <option value="status">Update status</option>
                </select>
              </label>
              <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
                Sort order
                <button
                  type="button"
                  onClick={() => setSortDirection(current => current === 'asc' ? 'desc' : 'asc')}
                  aria-label="Toggle sort order"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left text-xs font-normal text-slate-800 hover:bg-slate-100"
                >
                  {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                </button>
              </div>
            </div>
            <p aria-live="polite" className="text-[11px] text-slate-500">
              Showing {filteredUpdates.length} of {result.updates.length}{' '}
              {result.updates.length === 1 ? 'daily update' : 'daily updates'}
            </p>
          </div>

          {filteredUpdates.length === 0 ? (
            <div
              role="status"
              className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
            >
              No daily updates match these filters.
            </div>
          ) : (
            filteredUpdates.map(update => {
              const designation = CAREER_LEVELS.find(level => level.value === update.level)?.designation;
              return (
                <article key={update.employeeId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                  <header className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-bold text-slate-900">{update.employeeName}</h2>
                      <p className="mt-0.5 text-xs text-slate-500">@{update.employeeGithubUsername}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-adn-50 px-2.5 py-1 text-xs font-semibold text-adn-800">
                        {update.level}{designation ? ` · ${designation}` : ''}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        update.status === 'locked'
                          ? 'bg-slate-100 text-slate-700'
                          : update.status === 'submitted'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}>
                        {update.status === 'locked' ? 'Locked' : update.status === 'submitted' ? 'Submitted' : 'Draft'}
                      </span>
                    </div>
                  </header>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {updateSections.map(section => {
                      const items = update[section.key];
                      return (
                        <section key={section.key} aria-label={section.title}>
                          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                            {section.title}
                          </h3>
                          {items.length > 0 ? (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-slate-600">
                              {items.map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                          ) : (
                            <p className="mt-2 text-sm italic text-slate-400">None reported</p>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </article>
              );
            })
          )}
        </div>
      ) : null}
    </section>
  );
};
