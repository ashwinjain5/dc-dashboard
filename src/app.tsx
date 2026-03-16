import { useState, useCallback } from 'preact/hooks';
import type { DashboardData } from './types';
import { decryptBundle } from './crypto';
import { LoginScreen } from './components/LoginScreen';
import { TabBar } from './components/TabBar';
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
import { KaarigharTab } from './components/KaarigharTab';
import { ReadyMaalTab } from './components/ReadyMaalTab';
import { RawMaterialTab } from './components/RawMaterialTab';
import { PaymentsTab } from './components/PaymentsTab';

const TABS = ['Home', 'Kaarighar', 'Ready Maal', 'Raw Material', 'Payments'];

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
    fgReceiptsAll: raw.fg_receipts_all,
    dcItemsAll: raw.dc_items_all,
    paymentsAll: raw.payments_all,
  } as DashboardData;
}

const SESSION_KEY = 'dc_dash_session';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function getStoredCredentials(): { email: string; password: string } | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return { email: parsed.email, password: parsed.password };
  } catch { /* ignore */ }
  return null;
}

function storeCredentials(email: string, password: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email, password, expiresAt: Date.now() + ONE_YEAR_MS }));
}

export function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

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
      localStorage.removeItem(SESSION_KEY);
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
    <div class="mx-auto max-w-lg px-3 pb-16 md:max-w-3xl lg:max-w-5xl">
      <TabBar tabs={TABS} active={activeTab} onTabChange={setActiveTab} />

      {activeTab === 0 && (
        <div>
          <Header meta={data.meta} />
          <HeroTotal overview={data.overview} />
          <SummaryCards overview={data.overview} />
          <CustomerLedger customers={data.customers} details={data.customerDetails} />
          <div class="md:grid md:grid-cols-2 md:gap-4">
            <AgingBreakdown aging={data.aging} />
            <TrendTable trends={data.trends} />
          </div>
          <div class="md:grid md:grid-cols-2 md:gap-4">
            <MaterialSummary material={data.material} />
            <FGAnalysis fgSummary={data.fgSummary} />
          </div>
          <div class="md:grid md:grid-cols-2 md:gap-4">
            <RateAnalysis rates={data.rates} />
            <MarketSummary market={data.marketSummary} />
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <KaarigharTab
          customers={data.customers}
          details={data.customerDetails}
          dcItemsAll={data.dcItemsAll}
          fgReceiptsAll={data.fgReceiptsAll}
          paymentsAll={data.paymentsAll}
        />
      )}

      {activeTab === 2 && (
        <ReadyMaalTab fgReceipts={data.fgReceiptsAll} />
      )}

      {activeTab === 3 && (
        <RawMaterialTab dcItems={data.dcItemsAll} />
      )}

      {activeTab === 4 && (
        <PaymentsTab payments={data.paymentsAll} />
      )}
    </div>
  );
}
