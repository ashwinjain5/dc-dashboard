#!/usr/bin/env node
'use strict';

/**
 * NDJSON → Dashboard JSON Summaries
 * ==================================
 * Reads a full-snapshot NDJSON export and produces pre-computed JSON summary
 * files for the static dashboard. Reuses entity parsing from ndjson_to_excel.js.
 *
 * Usage:
 *   node ndjson_to_summaries.js <ndjson_file> <output_dir>
 *
 * Output files:
 *   meta.json, overview.json, customers.json, customer_details.json,
 *   aging.json, trends.json, material.json, rates.json,
 *   fg_summary.json, market_summary.json
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY TABLE MAPPING (same as ndjson_to_excel.js)
// ─────────────────────────────────────────────────────────────────────────────
const ENTITY_TABLE = {
  delivery_challan: 'delivery_challans',
  invoice: 'invoices',
  customer: 'customers',
  item: 'items',
  customer_rate: 'customer_rates',
  inventory_entry: 'inventory_ledger',
  pending_material: 'pending_material_ledger',
  extra_material: 'extra_material_ledger',
  market_item: 'market_items',
  category: 'categories',
  user: 'users',
  counter: 'counters',
  setting: 'settings',
  import_log: 'import_logs',
  dashboard: 'dashboard_cache',
  stock_balance: 'stock_balances',
  extra_material_usage: 'extra_material_usage',
  pending_material_dispatch: 'pending_material_dispatch',
  material_transfer: 'material_transfers',
  dc_edit_log: 'dc_edit_logs',
  payment: 'payments',
  fg_product: 'fg_products',
  fg_receipt: 'fg_receipts',
  customer_balance: 'customer_balances',
};

// Embedded arrays config
const ENTITY_ARRAYS = {
  delivery_challan: [
    { field: 'items', table: 'dc_items', fk: 'dc_id', children: [{ field: 'extra_sources', table: 'dc_item_extra_sources', fk: 'dc_item_id' }] },
    { field: 'ledger_entries', table: 'inventory_ledger' },
    { field: 'stock_updates', table: 'stock_balances' },
    { field: 'extra_entries', table: 'extra_material_ledger' },
    { field: 'extra_usage_entries', table: 'extra_material_usage' },
    { field: 'pending_entries', table: 'pending_material_ledger' },
    { field: 'pending_dispatch_entries', table: 'pending_material_dispatch' },
    { field: 'market_entries', table: 'market_items' },
    { field: 'edit_log_entries', table: 'dc_edit_logs' },
    { field: 'transfer', table: 'material_transfers', single: true },
    { field: 'transfer_items', table: 'material_transfer_items' },
    { field: 'dc_updates', table: 'delivery_challans' },
    { field: 'dc_item_updates', table: 'dc_items' },
  ],
  invoice: [
    { field: 'items', table: 'invoice_items', fk: 'invoice_id' },
    { field: 'dc_entries', table: 'invoice_dcs', fk: 'invoice_id' },
    { field: 'payment_ids', table: 'invoice_payments', type: 'string_array', fk: 'invoice_id' },
    { field: 'fg_receipt_ids', table: 'invoice_fg_receipts', type: 'string_array', fk: 'invoice_id' },
    { field: 'dc_updates', table: 'delivery_challans' },
    { field: 'payment_updates', table: 'payments' },
    { field: 'fg_receipt_updates', table: 'fg_receipts' },
    { field: 'balance_update', table: 'customer_balances', single: true },
  ],
  item: [
    { field: 'field_values', table: 'item_field_values', type: 'map', fk: 'item_id' },
    { field: 'aliases', table: 'item_aliases', type: 'string_array', fk: 'item_id' },
  ],
  customer_rate: [
    { field: 'edit_log', table: 'rate_edit_logs', single: true },
  ],
  inventory_entry: [
    { field: 'stock_update', table: 'stock_balances', single: true },
  ],
  pending_material: [
    { field: 'dispatch', table: 'pending_material_dispatch', single: true },
    { field: 'dc_item_update', table: 'dc_items', single: true },
    { field: 'dc_update', table: 'delivery_challans', single: true },
    { field: 'ledger_entry', table: 'inventory_ledger', single: true },
    { field: 'stock_update', table: 'stock_balances', single: true },
  ],
  extra_material: [
    { field: 'usage', table: 'extra_material_usage', single: true },
  ],
  market_item: [
    { field: 'extra_entry', table: 'extra_material_ledger', single: true },
  ],
  category: [
    { field: 'fields_config', table: 'category_fields', fk: 'category_id', children: [{ field: 'options', table: 'category_field_options', fk: 'category_field_id' }] },
  ],
};


// ─────────────────────────────────────────────────────────────────────────────
// PARSING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function normalizeTimestamp(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object' && '_seconds' in val) {
    return new Date(val._seconds * 1000).toISOString();
  }
  if (typeof val === 'string') return val;
  return null;
}

function toNum(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/** Parse NDJSON and collect into per-entity Maps (keyed by _id, latest wins). */
async function parseNDJSON(filePath) {
  const tables = {};
  // Initialize all known tables
  for (const t of Object.values(ENTITY_TABLE)) {
    if (!tables[t]) tables[t] = new Map();
  }
  // Extra tables from arrays
  const extraTables = [
    'dc_items', 'dc_item_extra_sources', 'invoice_items', 'invoice_dcs',
    'invoice_payments', 'invoice_fg_receipts', 'item_field_values',
    'item_aliases', 'rate_edit_logs', 'material_transfer_items',
    'category_fields', 'category_field_options',
  ];
  for (const t of extraTables) {
    if (!tables[t]) tables[t] = new Map();
  }

  let snapshotTs = null;

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, 'utf8'),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let entry;
    try { entry = JSON.parse(trimmed); } catch { continue; }
    if (!entry._entity) continue;

    // Track latest timestamp
    if (entry._ts && (!snapshotTs || entry._ts > snapshotTs)) {
      snapshotTs = entry._ts;
    }

    const parentTable = ENTITY_TABLE[entry._entity];
    if (!parentTable || !tables[parentTable]) continue;

    // UPSERT parent record
    const id = entry._id || entry.id;
    if (id) {
      tables[parentTable].set(id, entry);
    }

    // Process embedded arrays
    const arrayCfgs = ENTITY_ARRAYS[entry._entity] || [];
    for (const cfg of arrayCfgs) {
      const data = entry[cfg.field];
      if (!data) continue;

      if (!tables[cfg.table]) tables[cfg.table] = new Map();

      if (cfg.type === 'string_array' && Array.isArray(data)) {
        for (const s of data) {
          const key = `${id}||${s}`;
          const row = {};
          if (cfg.fk) row[cfg.fk] = id;
          // Determine value col
          const valueCol = cfg.table === 'invoice_payments' ? 'payment_id'
            : cfg.table === 'invoice_fg_receipts' ? 'fg_receipt_id'
            : cfg.table === 'item_aliases' ? 'alias' : 'value';
          row[valueCol] = s;
          tables[cfg.table].set(key, row);
        }
      } else if (cfg.type === 'map' && typeof data === 'object' && !Array.isArray(data)) {
        for (const [k, v] of Object.entries(data)) {
          const key = `${id}||${k}`;
          const row = { field_name: k, field_value: String(v) };
          if (cfg.fk) row[cfg.fk] = id;
          tables[cfg.table].set(key, row);
        }
      } else {
        const items = cfg.single ? [data] : (Array.isArray(data) ? data : [data]);
        for (const child of items) {
          if (!child || typeof child !== 'object') continue;
          const childId = child.id || child._id || `${id}||${cfg.field}||${Math.random()}`;
          if (cfg.fk) child[cfg.fk] = id;
          tables[cfg.table].set(childId, child);

          // Nested children
          if (cfg.children) {
            for (const nested of cfg.children) {
              let nestedData = child[nested.field];
              if (!nestedData) continue;
              if (!Array.isArray(nestedData)) nestedData = [nestedData];
              if (!tables[nested.table]) tables[nested.table] = new Map();
              for (const nr of nestedData) {
                if (!nr || typeof nr !== 'object') continue;
                const nId = nr.id || `${childId}||${nested.field}||${Math.random()}`;
                if (nested.fk) nr[nested.fk] = child.id;
                tables[nested.table].set(nId, nr);
              }
            }
          }
        }
      }
    }
  }

  return { tables, snapshotTs };
}


// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

function daysBetween(dateStr, refDate) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((refDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function monthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function agingBucket(days) {
  if (days <= 15) return '0_15';
  if (days <= 30) return '15_30';
  if (days <= 60) return '30_60';
  return '60_plus';
}

function generateMeta(tables, snapshotTs) {
  const counts = {};
  for (const [table, map] of Object.entries(tables)) {
    if (map.size > 0) counts[table] = map.size;
  }
  return {
    snapshot_date: snapshotTs || new Date().toISOString(),
    processed_at: new Date().toISOString(),
    record_counts: counts,
  };
}

function generateOverview(tables, now) {
  const dcs = [...tables.delivery_challans.values()];
  const payments = [...tables.payments.values()];
  const fgReceipts = [...tables.fg_receipts.values()];
  const customers = [...tables.customers.values()];
  const balances = [...tables.customer_balances.values()];

  const activeDcs = dcs.filter(d => d.status === 'Active');
  const openPayments = payments.filter(p => p.status === 'Recorded' || p.status === 'Open');
  const openFg = fgReceipts.filter(f => f.status === 'Received' || f.status === 'Open');

  return {
    total_outstanding:
      activeDcs.reduce((s, d) => s + toNum(d.total_amount), 0) +
      openPayments.reduce((s, p) => s + toNum(p.amount), 0) -
      openFg.reduce((s, f) => s + toNum(f.amount), 0),
    active_dc_total: activeDcs.reduce((s, d) => s + toNum(d.total_amount), 0),
    active_dc_count: activeDcs.length,
    open_payments_total: openPayments.reduce((s, p) => s + toNum(p.amount), 0),
    open_payments_count: openPayments.length,
    fg_received_open_total: openFg.reduce((s, f) => s + toNum(f.amount), 0),
    fg_received_open_count: openFg.length,
    fg_received_open_qty: openFg.reduce((s, f) => s + toNum(f.quantity), 0),
    carry_forward_balance_total: balances.reduce((s, b) => s + toNum(b.balance), 0),
    total_customers: customers.length,
    active_customers: customers.filter(c => c.is_active === true || c.is_active === 'true').length,
  };
}

function generateCustomers(tables, now) {
  const customers = [...tables.customers.values()];
  const dcs = [...tables.delivery_challans.values()];
  const payments = [...tables.payments.values()];
  const fgReceipts = [...tables.fg_receipts.values()];
  const balances = new Map([...tables.customer_balances.values()].map(b => [b.customer_id, b]));

  return customers
    .map(c => {
      const cId = c.id || c._id;
      const custDcs = dcs.filter(d => d.customer_id === cId && d.status === 'Active');
      const custPayments = payments.filter(p => p.customer_id === cId && (p.status === 'Recorded' || p.status === 'Open'));
      const custFg = fgReceipts.filter(f => f.customer_id === cId && (f.status === 'Received' || f.status === 'Open'));
      const bal = balances.get(cId);

      const activeDcTotal = custDcs.reduce((s, d) => s + toNum(d.total_amount), 0);
      const openPayTotal = custPayments.reduce((s, p) => s + toNum(p.amount), 0);
      const fgOpenTotal = custFg.reduce((s, f) => s + toNum(f.amount), 0);
      const cfBalance = toNum(bal?.balance);

      // Find oldest active DC age
      let oldestDcDays = 0;
      for (const d of custDcs) {
        const dcDate = normalizeTimestamp(d.dc_date) || normalizeTimestamp(d.created_at);
        const age = daysBetween(dcDate, now);
        if (age > oldestDcDays) oldestDcDays = age;
      }

      // Last payment date
      let lastPayDate = null;
      for (const p of custPayments) {
        const pd = normalizeTimestamp(p.payment_date) || normalizeTimestamp(p.created_at);
        if (pd && (!lastPayDate || pd > lastPayDate)) lastPayDate = pd;
      }

      // Last DC date
      let lastDcDate = null;
      for (const d of custDcs) {
        const dd = normalizeTimestamp(d.dc_date) || normalizeTimestamp(d.created_at);
        if (dd && (!lastDcDate || dd > lastDcDate)) lastDcDate = dd;
      }

      return {
        id: cId,
        name: c.name || 'Unknown',
        customer_type: c.customer_type || '',
        is_active: c.is_active === true || c.is_active === 'true',
        outstanding: activeDcTotal + openPayTotal - fgOpenTotal,
        active_dc_total: activeDcTotal,
        active_dc_count: custDcs.length,
        open_payments_total: openPayTotal,
        open_payments_count: custPayments.length,
        fg_open_total: fgOpenTotal,
        fg_open_count: custFg.length,
        carry_forward_balance: cfBalance,
        oldest_active_dc_days: oldestDcDays,
        last_payment_date: lastPayDate ? lastPayDate.split('T')[0] : null,
        last_dc_date: lastDcDate ? lastDcDate.split('T')[0] : null,
      };
    })
    .sort((a, b) => b.outstanding - a.outstanding);
}

function generateCustomerDetails(tables, now) {
  const customers = [...tables.customers.values()];
  const dcs = [...tables.delivery_challans.values()];
  const dcItems = [...tables.dc_items.values()];
  const payments = [...tables.payments.values()];
  const fgReceipts = [...tables.fg_receipts.values()];
  const stockBalances = [...tables.stock_balances.values()];
  const items = new Map([...tables.items.values()].map(i => [i.id || i._id, i]));

  const details = {};

  for (const c of customers) {
    const cId = c.id || c._id;

    // Active DCs
    const custDcs = dcs.filter(d => d.customer_id === cId && d.status === 'Active');
    const activeDcsList = custDcs.map(d => {
      const dcDate = normalizeTimestamp(d.dc_date) || normalizeTimestamp(d.created_at);
      const dcItemsList = dcItems.filter(di => di.dc_id === (d.id || d._id));
      return {
        dc_number: d.dc_number || d.record_id || '',
        dc_date: dcDate ? dcDate.split('T')[0] : '',
        dc_type: d.dc_type || '',
        total_amount: toNum(d.total_amount),
        age_days: daysBetween(dcDate, now),
        item_count: dcItemsList.length,
      };
    }).sort((a, b) => b.age_days - a.age_days);

    // Open payments
    const custPayments = payments.filter(p => p.customer_id === cId && (p.status === 'Recorded' || p.status === 'Open'));
    const openPaymentsList = custPayments.map(p => {
      const pd = normalizeTimestamp(p.payment_date) || normalizeTimestamp(p.created_at);
      return {
        payment_number: p.payment_number || '',
        payment_date: pd ? pd.split('T')[0] : '',
        amount: toNum(p.amount),
        payment_mode: p.payment_mode || '',
      };
    }).sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''));

    // Open FG receipts
    const custFg = fgReceipts.filter(f => f.customer_id === cId && (f.status === 'Received' || f.status === 'Open'));
    const openFgList = custFg.map(f => {
      const rd = normalizeTimestamp(f.receipt_date) || normalizeTimestamp(f.created_at);
      return {
        receipt_number: f.receipt_number || '',
        receipt_date: rd ? rd.split('T')[0] : '',
        product_name: f.product_name || '',
        quantity: toNum(f.quantity),
        amount: toNum(f.amount),
      };
    });

    // Stock balances
    const custStock = stockBalances.filter(sb => sb.customer_id === cId && toNum(sb.balance) !== 0);
    const stockList = custStock.map(sb => {
      const item = items.get(sb.item_id);
      return {
        item_name: item?.item_name || item?.name || sb.item_id,
        balance: toNum(sb.balance),
        unit: item?.unit || '',
      };
    }).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    // Only include customers that have some data
    if (activeDcsList.length || openPaymentsList.length || openFgList.length || stockList.length) {
      details[cId] = {
        active_dcs: activeDcsList,
        open_payments: openPaymentsList,
        open_fg_receipts: openFgList,
        stock_balances: stockList,
      };
    }
  }

  return details;
}

function generateAging(tables, now) {
  const dcs = [...tables.delivery_challans.values()].filter(d => d.status === 'Active');
  const payments = [...tables.payments.values()].filter(p => p.status === 'Recorded' || p.status === 'Open');
  const fgReceipts = [...tables.fg_receipts.values()].filter(f => f.status === 'Received' || f.status === 'Open');

  function bucketize(items, dateField, amountField) {
    const buckets = {
      '0_15': { count: 0, amount: 0 },
      '15_30': { count: 0, amount: 0 },
      '30_60': { count: 0, amount: 0 },
      '60_plus': { count: 0, amount: 0 },
    };
    for (const item of items) {
      const dateStr = normalizeTimestamp(item[dateField]) || normalizeTimestamp(item.created_at);
      const days = daysBetween(dateStr, now);
      const bucket = agingBucket(days);
      buckets[bucket].count++;
      buckets[bucket].amount += toNum(item[amountField]);
    }
    return buckets;
  }

  return {
    dc_aging: bucketize(dcs, 'dc_date', 'total_amount'),
    payment_aging: bucketize(payments, 'payment_date', 'amount'),
    fg_aging: bucketize(fgReceipts, 'receipt_date', 'amount'),
  };
}

function generateTrends(tables) {
  const dcs = [...tables.delivery_challans.values()];
  const payments = [...tables.payments.values()];
  const fgReceipts = [...tables.fg_receipts.values()];
  const invoices = [...tables.invoices.values()];

  // Determine last 6 months
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
  }

  function aggregate(items, dateField, amountField) {
    const amounts = new Array(6).fill(0);
    const counts = new Array(6).fill(0);
    for (const item of items) {
      const dateStr = normalizeTimestamp(item[dateField]) || normalizeTimestamp(item.created_at);
      const mk = monthKey(dateStr);
      const idx = months.indexOf(mk);
      if (idx >= 0) {
        amounts[idx] += toNum(item[amountField]);
        counts[idx]++;
      }
    }
    return { amounts, counts };
  }

  // Exclude cancelled
  const activeDcs = dcs.filter(d => d.status !== 'Cancelled');
  const activePayments = payments.filter(p => p.status !== 'Cancelled');
  const activeFg = fgReceipts.filter(f => f.status !== 'Cancelled');
  const activeInvoices = invoices.filter(i => i.status !== 'Cancelled');

  const dcAgg = aggregate(activeDcs, 'dc_date', 'total_amount');
  const payAgg = aggregate(activePayments, 'payment_date', 'amount');
  const fgAgg = aggregate(activeFg, 'receipt_date', 'amount');
  const invAgg = aggregate(activeInvoices, 'invoice_date', 'grand_total');

  return {
    months,
    dc_amounts: dcAgg.amounts,
    dc_counts: dcAgg.counts,
    payment_amounts: payAgg.amounts,
    payment_counts: payAgg.counts,
    fg_amounts: fgAgg.amounts,
    fg_counts: fgAgg.counts,
    invoice_amounts: invAgg.amounts,
    invoice_counts: invAgg.counts,
  };
}

function generateMaterial(tables) {
  const stockBalances = [...tables.stock_balances.values()];
  const extraMaterial = [...tables.extra_material_ledger.values()];
  const pendingMaterial = [...tables.pending_material_ledger.values()];
  const items = new Map([...tables.items.values()].map(i => [i.id || i._id, i]));
  const customers = new Map([...tables.customers.values()].map(c => [c.id || c._id, c]));

  // Stock summary: aggregate by item
  const stockByItem = {};
  for (const sb of stockBalances) {
    const bal = toNum(sb.balance);
    if (bal === 0) continue;
    if (!stockByItem[sb.item_id]) {
      const item = items.get(sb.item_id);
      stockByItem[sb.item_id] = {
        item_name: item?.item_name || item?.name || sb.item_id,
        sku: item?.sku || '',
        total_balance: 0,
        unit: item?.unit || '',
        customers_holding: 0,
      };
    }
    stockByItem[sb.item_id].total_balance += bal;
    stockByItem[sb.item_id].customers_holding++;
  }

  // Extra material
  const activeExtra = extraMaterial.filter(e => e.status === 'Active' || e.status === 'active');
  const extraByCustomer = {};
  for (const e of activeExtra) {
    const cust = customers.get(e.customer_id);
    const name = cust?.name || e.customer_id;
    if (!extraByCustomer[name]) extraByCustomer[name] = { name, entries: 0, quantity: 0 };
    extraByCustomer[name].entries++;
    extraByCustomer[name].quantity += toNum(e.quantity);
  }

  // Pending material
  const activePending = pendingMaterial.filter(p => p.status === 'Pending' || p.status === 'pending');
  const pendingByCustomer = {};
  for (const p of activePending) {
    const cust = customers.get(p.customer_id);
    const name = cust?.name || p.customer_id;
    if (!pendingByCustomer[name]) pendingByCustomer[name] = { name, entries: 0, quantity: 0 };
    pendingByCustomer[name].entries++;
    pendingByCustomer[name].quantity += toNum(p.quantity);
  }

  return {
    stock_summary: Object.values(stockByItem).sort((a, b) => Math.abs(b.total_balance) - Math.abs(a.total_balance)),
    extra_material: {
      total_active_entries: activeExtra.length,
      total_active_quantity: activeExtra.reduce((s, e) => s + toNum(e.quantity), 0),
      by_customer: Object.values(extraByCustomer).sort((a, b) => b.quantity - a.quantity),
    },
    pending_material: {
      total_pending_entries: activePending.length,
      total_pending_quantity: activePending.reduce((s, p) => s + toNum(p.quantity), 0),
      by_customer: Object.values(pendingByCustomer).sort((a, b) => b.quantity - a.quantity),
    },
  };
}

function generateRates(tables) {
  const rates = [...tables.customer_rates.values()].filter(r => r.is_active === true || r.is_active === 'true');
  const items = new Map([...tables.items.values()].map(i => [i.id || i._id, i]));
  const fgProducts = new Map([...tables.fg_products.values()].map(p => [p.id || p._id, p]));
  const customers = new Map([...tables.customers.values()].map(c => [c.id || c._id, c]));

  // Group by item_id
  const ratesByItem = {};
  for (const r of rates) {
    if (!ratesByItem[r.item_id]) ratesByItem[r.item_id] = [];
    ratesByItem[r.item_id].push(r);
  }

  const result = [];
  for (const [itemId, itemRates] of Object.entries(ratesByItem)) {
    if (itemRates.length < 1) continue;

    const item = items.get(itemId);
    const fgProd = fgProducts.get(itemId);
    const basePrice = toNum(item?.base_price || fgProd?.store_price);

    const customerRates = itemRates.map(r => {
      const cust = customers.get(r.customer_id);
      const rate = toNum(r.rate);
      return {
        customer_name: cust?.name || r.customer_id,
        rate,
        variance_pct: basePrice > 0 ? Math.round(((rate - basePrice) / basePrice) * 100) : 0,
        effective_date: normalizeTimestamp(r.effective_date)?.split('T')[0] || '',
        dc_type: r.dc_type || 'Material Sale',
      };
    }).sort((a, b) => a.variance_pct - b.variance_pct);

    result.push({
      item_name: item?.item_name || fgProd?.product_name || itemId,
      sku: item?.sku || fgProd?.model_id || '',
      base_price: basePrice,
      dc_type: itemRates[0]?.dc_type || 'Material Sale',
      customer_rates: customerRates,
    });
  }

  return {
    items_with_variance: result.sort((a, b) => b.customer_rates.length - a.customer_rates.length),
  };
}

function generateFGSummary(tables) {
  const fgProducts = [...tables.fg_products.values()];
  const fgReceipts = [...tables.fg_receipts.values()];
  const customers = new Map([...tables.customers.values()].map(c => [c.id || c._id, c]));

  // By product
  const byProduct = fgProducts.map(p => {
    const pId = p.id || p._id;
    const receipts = fgReceipts.filter(r => r.fg_product_id === pId && r.status !== 'Cancelled');
    const openReceipts = receipts.filter(r => r.status === 'Received' || r.status === 'Open');

    // Top suppliers
    const supplierCounts = {};
    for (const r of receipts) {
      const cust = customers.get(r.customer_id);
      const name = cust?.name || r.customer_name || r.customer_id;
      supplierCounts[name] = (supplierCounts[name] || 0) + toNum(r.quantity);
    }
    const topSuppliers = Object.entries(supplierCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);

    return {
      model_id: p.model_id || '',
      product_name: p.product_name || '',
      store_price: toNum(p.store_price),
      total_received_qty: receipts.reduce((s, r) => s + toNum(r.quantity), 0),
      total_received_amount: receipts.reduce((s, r) => s + toNum(r.amount), 0),
      open_qty: openReceipts.reduce((s, r) => s + toNum(r.quantity), 0),
      open_amount: openReceipts.reduce((s, r) => s + toNum(r.amount), 0),
      top_suppliers: topSuppliers,
    };
  }).sort((a, b) => b.total_received_qty - a.total_received_qty);

  // By customer
  const custAgg = {};
  for (const r of fgReceipts.filter(r => r.status !== 'Cancelled')) {
    const cust = customers.get(r.customer_id);
    const name = cust?.name || r.customer_name || r.customer_id;
    if (!custAgg[name]) custAgg[name] = { customer_name: name, total_received_qty: 0, total_received_amount: 0, open_qty: 0, products: new Set() };
    custAgg[name].total_received_qty += toNum(r.quantity);
    custAgg[name].total_received_amount += toNum(r.amount);
    if (r.status === 'Received' || r.status === 'Open') custAgg[name].open_qty += toNum(r.quantity);
    custAgg[name].products.add(r.fg_product_id);
  }

  const byCustomer = Object.values(custAgg).map(c => ({
    customer_name: c.customer_name,
    total_received_qty: c.total_received_qty,
    total_received_amount: c.total_received_amount,
    open_qty: c.open_qty,
    products_count: c.products.size,
  })).sort((a, b) => b.total_received_qty - a.total_received_qty);

  return { by_product: byProduct, by_customer: byCustomer };
}

function generateFGReceiptsAll(tables) {
  const fgReceipts = [...tables.fg_receipts.values()].filter(r => r.status !== 'Cancelled');
  const customers = new Map([...tables.customers.values()].map(c => [c.id || c._id, c]));

  return fgReceipts.map(r => {
    const cust = customers.get(r.customer_id);
    const rd = normalizeTimestamp(r.receipt_date) || normalizeTimestamp(r.created_at);
    return {
      receipt_number: r.receipt_number || '',
      receipt_date: rd ? rd.split('T')[0] : '',
      product_name: r.product_name || '',
      model_id: r.model_id || '',
      customer_id: r.customer_id || '',
      customer_name: cust?.name || r.customer_name || '',
      quantity: toNum(r.quantity),
      purchase_rate: toNum(r.purchase_rate),
      amount: toNum(r.amount),
      status: r.status || '',
      is_order_related: r.is_order_related === true || r.is_order_related === 'true',
    };
  }).sort((a, b) => (b.receipt_date || '').localeCompare(a.receipt_date || ''));
}

function generateDCItemsAll(tables) {
  const dcs = [...tables.delivery_challans.values()].filter(d => d.status !== 'Cancelled');
  const dcItems = [...tables.dc_items.values()];
  const customers = new Map([...tables.customers.values()].map(c => [c.id || c._id, c]));

  const result = [];
  for (const dc of dcs) {
    const dcId = dc.id || dc._id;
    const cust = customers.get(dc.customer_id);
    const dcDate = normalizeTimestamp(dc.dc_date) || normalizeTimestamp(dc.created_at);
    const items = dcItems.filter(di => di.dc_id === dcId);

    for (const item of items) {
      result.push({
        dc_number: dc.dc_number || '',
        dc_date: dcDate ? dcDate.split('T')[0] : '',
        dc_type: dc.dc_type || '',
        dc_status: dc.status || '',
        customer_id: dc.customer_id || '',
        customer_name: cust?.name || dc.customer_name || '',
        item_id: item.item_id || '',
        item_name: item.item_name || '',
        sku: item.sku || '',
        category_name: item.category_name || '',
        unit: item.unit || '',
        quantity: toNum(item.quantity),
        rate: toNum(item.rate),
        amount: toNum(item.amount),
      });
    }
  }

  return result.sort((a, b) => (b.dc_date || '').localeCompare(a.dc_date || ''));
}

function generatePaymentsAll(tables) {
  const payments = [...tables.payments.values()].filter(p => p.status !== 'Cancelled');
  const customers = new Map([...tables.customers.values()].map(c => [c.id || c._id, c]));

  return payments.map(p => {
    const cust = customers.get(p.customer_id);
    const pd = normalizeTimestamp(p.payment_date) || normalizeTimestamp(p.created_at);
    return {
      payment_number: p.payment_number || '',
      payment_date: pd ? pd.split('T')[0] : '',
      customer_id: p.customer_id || '',
      customer_name: cust?.name || p.customer_name || '',
      amount: toNum(p.amount),
      payment_mode: p.payment_mode || '',
      status: p.status || '',
      invoice_id: p.invoice_id || null,
      invoice_number: p.invoice_number || null,
    };
  }).sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''));
}

function generateMarketSummary(tables) {
  const marketItems = [...tables.market_items.values()];
  const items = new Map([...tables.items.values()].map(i => [i.id || i._id, i]));

  const activeItems = marketItems.filter(m => m.status !== 'Cancelled');
  const pendingItems = activeItems.filter(m => m.status === 'Pending' || m.status === 'pending');
  const filledItems = activeItems.filter(m => m.status === 'Filled' || m.status === 'filled');

  // By item
  const byItem = {};
  for (const m of activeItems) {
    const item = items.get(m.item_id);
    const name = m.item_name || item?.item_name || m.item_id;
    if (!byItem[name]) byItem[name] = { item_name: name, total_qty: 0, total_amount: 0, purchase_count: 0 };
    byItem[name].total_qty += toNum(m.quantity || m.purchased_qty);
    byItem[name].total_amount += toNum(m.amount);
    byItem[name].purchase_count++;
  }

  return {
    total_market_amount: activeItems.reduce((s, m) => s + toNum(m.amount), 0),
    total_market_items: activeItems.length,
    pending_count: pendingItems.length,
    filled_count: filledItems.length,
    by_item: Object.values(byItem).sort((a, b) => b.total_amount - a.total_amount),
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node ndjson_to_summaries.js <ndjson_file> <output_dir>');
    process.exit(1);
  }

  const ndjsonPath = path.resolve(args[0]);
  const outputDir = path.resolve(args[1]);

  if (!fs.existsSync(ndjsonPath)) {
    console.error(`Error: NDJSON file not found: ${ndjsonPath}`);
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Processing: ${path.basename(ndjsonPath)}`);
  const { tables, snapshotTs } = await parseNDJSON(ndjsonPath);

  // Count records
  let totalRecords = 0;
  for (const map of Object.values(tables)) {
    totalRecords += map.size;
  }
  console.log(`Parsed ${totalRecords} total records`);

  const now = new Date();

  // Generate all summaries
  const summaries = {
    'meta.json': generateMeta(tables, snapshotTs),
    'overview.json': generateOverview(tables, now),
    'customers.json': generateCustomers(tables, now),
    'customer_details.json': generateCustomerDetails(tables, now),
    'aging.json': generateAging(tables, now),
    'trends.json': generateTrends(tables),
    'material.json': generateMaterial(tables),
    'rates.json': generateRates(tables),
    'fg_summary.json': generateFGSummary(tables),
    'market_summary.json': generateMarketSummary(tables),
    'fg_receipts_all.json': generateFGReceiptsAll(tables),
    'dc_items_all.json': generateDCItemsAll(tables),
    'payments_all.json': generatePaymentsAll(tables),
  };

  // Write files
  for (const [filename, data] of Object.entries(summaries)) {
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    const sizeKB = (Buffer.byteLength(JSON.stringify(data)) / 1024).toFixed(1);
    console.log(`  ${filename.padEnd(25)} ${sizeKB} KB`);
  }

  console.log('\nDone! Summary files written to:', outputDir);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
