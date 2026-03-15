import { useState, useCallback } from 'preact/hooks';
import type { DashboardData } from './types';
import { decryptBundle } from './crypto';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { HeroTotal } from './components/HeroTotal';
import { SummaryCards } from './components/SummaryCards';
import { CustomerLedger } from './components/CustomerLedger';
import { AgingBreakdown } from './components/AgingBreakdown';
import { TrendTable } from './components/TrendTable';
import { MaterialSummary } from './components/MaterialSummary';
import { FGAnalysis } from './components/FGAnalysis';
import { RateAnalysis } from './components/RateAnalysis';
import { MarketSummary } from './components/MarketSummary';

function mapToDashboardData(raw: Record<string, unknown>): DashboardData {
  return {
    meta: raw.meta,
    overview: raw.overview,
    customers: raw.customers,
    customerDetails: raw.customer_details,
    aging: raw.aging,
    trends: raw.trends,
    material: raw.material,
    rates: raw.rates,
    fgSummary: raw.fg_summary,
    marketSummary: raw.market_summary,
  } as DashboardData;
}

const SESSION_KEY = 'dc_dash_session';

function getStoredCredentials(): { email: string; password: string } | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

function storeCredentials(email: string, password: string) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email, password }));
}

export function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const attemptLoad = useCallback(async (email: string, password: string, isAutoLogin = false) => {
    setLoading(true);
    setLoginError(null);
    try {
      const base = import.meta.env.BASE_URL + 'data/';
      const res = await fetch(`${base}bundle.enc`);
      if (!res.ok) throw new Error('Data not available');
      const bundle = await res.json();
      const raw = await decryptBundle(bundle, email, password);
      const dashData = mapToDashboardData(raw);
      storeCredentials(email, password);
      setData(dashData);
      setAuthenticated(true);
    } catch {
      if (!isAutoLogin) {
        setLoginError('Invalid email or password');
      }
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  // Try auto-login from session on mount
  if (!authenticated && !loading && !loginError) {
    const stored = getStoredCredentials();
    if (stored) {
      attemptLoad(stored.email, stored.password, true);
    }
  }

  if (!authenticated || !data) {
    return (
      <LoginScreen
        onLogin={(email, password) => attemptLoad(email, password)}
        error={loginError}
        loading={loading}
      />
    );
  }

  return (
    <div class="mx-auto max-w-lg px-3 py-4 pb-16">
      <Header meta={data.meta} />
      <HeroTotal overview={data.overview} />
      <SummaryCards overview={data.overview} />
      <CustomerLedger customers={data.customers} details={data.customerDetails} />
      <AgingBreakdown aging={data.aging} />
      <TrendTable trends={data.trends} />
      <MaterialSummary material={data.material} />
      <FGAnalysis fgSummary={data.fgSummary} />
      <RateAnalysis rates={data.rates} />
      <MarketSummary market={data.marketSummary} />
    </div>
  );
}
