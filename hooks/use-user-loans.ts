'use client';

import { useCallback, useEffect, useState } from 'react';
import { useBorrowContext } from '@/components/borrow-context';
import { normalizeLoan, type LoanHistoryFilter, type LoanSummary } from '@/lib/loan-summary';

export function useUserLoans({ initialFilter = 'active', pageSize = 10 }: { initialFilter?: LoanHistoryFilter; pageSize?: number } = {}) {
  const { sdk, state } = useBorrowContext();
  const [filter, setFilterState] = useState<LoanHistoryFilter>(initialFilter);
  const [page, setPage] = useState(1);
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLoans, setTotalLoans] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const sessionReady = state.phase !== 'idle' && state.phase !== 'session_setup';
  const load = useCallback(async () => {
    if (!sessionReady) return;
    setLoading(true); setError(undefined);
    try {
      const response = await sdk.getLoanHistory({ page, limit: pageSize, status: filter });
      // getLoanHistory() is already scoped to borrow transactions. Do not filter
      // by the optional/legacy `type` discriminator: older API records may omit
      // it or use a backend-specific value even though they are valid loans.
      setLoans(response.transactions.map(normalizeLoan));
      setTotalPages(Math.max(1, response.pagination.totalPages)); setTotalLoans(response.pagination.totalTransactions);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Failed to load loans.'); }
    finally { setLoading(false); }
  }, [filter, page, pageSize, sdk, sessionReady]);
  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  const setFilter = useCallback((next: LoanHistoryFilter) => { setFilterState(next); setPage(1); }, []);
  return { loans, filter, page, totalPages, totalLoans, loading, error, sessionReady, setFilter, setPage, refresh: load };
}
