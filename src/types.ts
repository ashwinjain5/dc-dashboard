// ── Summary data types for the dashboard JSON files ──

export interface Meta {
  snapshot_date: string;
  processed_at: string;
  record_counts: Record<string, number>;
}

export interface Overview {
  total_outstanding: number;
  active_dc_total: number;
  active_dc_count: number;
  open_payments_total: number;
  open_payments_count: number;
  fg_received_open_total: number;
  fg_received_open_count: number;
  fg_received_open_qty: number;
  carry_forward_balance_total: number;
  total_customers: number;
  active_customers: number;
}

export interface CustomerSummary {
  id: string;
  name: string;
  customer_type: string;
  is_active: boolean;
  outstanding: number;
  active_dc_total: number;
  active_dc_count: number;
  open_payments_total: number;
  open_payments_count: number;
  fg_open_total: number;
  fg_open_count: number;
  carry_forward_balance: number;
  oldest_active_dc_days: number;
  last_payment_date: string | null;
  last_dc_date: string | null;
}

export interface ActiveDC {
  dc_number: string;
  dc_date: string;
  dc_type: string;
  total_amount: number;
  age_days: number;
  item_count: number;
}

export interface OpenPayment {
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_mode: string;
}

export interface OpenFGReceipt {
  receipt_number: string;
  receipt_date: string;
  product_name: string;
  quantity: number;
  amount: number;
}

export interface StockBalance {
  item_name: string;
  balance: number;
  unit: string;
}

export interface CustomerDetail {
  active_dcs: ActiveDC[];
  open_payments: OpenPayment[];
  open_fg_receipts: OpenFGReceipt[];
  stock_balances: StockBalance[];
}

export interface AgingBucket {
  count: number;
  amount: number;
}

export interface Aging {
  dc_aging: Record<string, AgingBucket>;
  payment_aging: Record<string, AgingBucket>;
  fg_aging: Record<string, AgingBucket>;
}

export interface Trends {
  months: string[];
  dc_amounts: number[];
  dc_counts: number[];
  payment_amounts: number[];
  payment_counts: number[];
  fg_amounts: number[];
  fg_counts: number[];
  invoice_amounts: number[];
  invoice_counts: number[];
}

export interface StockSummaryItem {
  item_name: string;
  sku: string;
  total_balance: number;
  unit: string;
  customers_holding: number;
}

export interface MaterialCustomerEntry {
  name: string;
  entries: number;
  quantity: number;
}

export interface Material {
  stock_summary: StockSummaryItem[];
  extra_material: {
    total_active_entries: number;
    total_active_quantity: number;
    by_customer: MaterialCustomerEntry[];
  };
  pending_material: {
    total_pending_entries: number;
    total_pending_quantity: number;
    by_customer: MaterialCustomerEntry[];
  };
}

export interface CustomerRate {
  customer_name: string;
  rate: number;
  variance_pct: number;
  effective_date: string;
  dc_type: string;
}

export interface RateItem {
  item_name: string;
  sku: string;
  base_price: number;
  dc_type: string;
  customer_rates: CustomerRate[];
}

export interface Rates {
  items_with_variance: RateItem[];
}

export interface FGProductSummary {
  model_id: string;
  product_name: string;
  store_price: number;
  total_received_qty: number;
  total_received_amount: number;
  open_qty: number;
  open_amount: number;
  top_suppliers: string[];
}

export interface FGCustomerSummary {
  customer_name: string;
  total_received_qty: number;
  total_received_amount: number;
  open_qty: number;
  products_count: number;
}

export interface FGSummary {
  by_product: FGProductSummary[];
  by_customer: FGCustomerSummary[];
}

export interface MarketItem {
  item_name: string;
  total_qty: number;
  total_amount: number;
  purchase_count: number;
}

export interface MarketSummary {
  total_market_amount: number;
  total_market_items: number;
  pending_count: number;
  filled_count: number;
  by_item: MarketItem[];
}

// ── Detail-level types for tab views ──

export interface FGReceiptDetail {
  receipt_number: string;
  receipt_date: string;
  product_name: string;
  model_id: string;
  customer_id: string;
  customer_name: string;
  quantity: number;
  purchase_rate: number;
  amount: number;
  status: string;
  is_order_related: boolean;
}

export interface DCItemDetail {
  dc_number: string;
  dc_date: string;
  dc_type: string;
  dc_status: string;
  customer_id: string;
  customer_name: string;
  item_id: string;
  item_name: string;
  sku: string;
  category_name: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface PaymentDetail {
  payment_number: string;
  payment_date: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  payment_mode: string;
  status: string;
  invoice_id: string | null;
  invoice_number: string | null;
}

export interface DashboardData {
  meta: Meta;
  overview: Overview;
  customers: CustomerSummary[];
  customerDetails: Record<string, CustomerDetail>;
  aging: Aging;
  trends: Trends;
  material: Material;
  rates: Rates;
  fgSummary: FGSummary;
  marketSummary: MarketSummary;
  fgReceiptsAll: FGReceiptDetail[];
  dcItemsAll: DCItemDetail[];
  paymentsAll: PaymentDetail[];
}
