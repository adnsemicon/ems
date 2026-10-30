import React, { useCallback, useEffect, useState } from 'react';
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

export const DailyUpdates: React.FC = () => {
  const [result, setResult] = useState<DailyUpdatesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
              {viewerDesignation ? ` (${viewerDesignation})` : ''}. Showing your level and below.
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
          No daily updates are available for your level and below today.
        </p>
      ) : !error && result ? (
        <div className="space-y-4">
          {result.updates.map(update => {
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
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {update.status === 'locked' ? 'Locked' : 'Saved'}
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
          })}
        </div>
      ) : null}
    </section>
  );
};
