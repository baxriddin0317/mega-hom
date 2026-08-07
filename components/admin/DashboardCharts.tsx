"use client";
import { useEffect, useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useOrderStore } from "@/zustand/useOrderStore";
import useExpenseStore from "@/zustand/useExpenseStore";
import { ORDER_STATUSES } from "@/lib/orderStatus";
import {
  aggregateOrders, dailyChannelSeries, matchesFilter,
  startOfToday, startOfDaysAgo,
} from "@/lib/reports";
import { FormattedPrice } from "@/utils";
import type { Period } from "./DashboardKPIs";

// Series colors — categorical pair validated with the dataviz palette checker
// (CVD ΔE 29.9, normal 38.3 vs white): Sayt is ALWAYS brand red, Doʼkon is
// ALWAYS blue, in every chart (color follows the entity, never the rank).
const C_WEB = "#DD2426";
const C_STORE = "#2563EB";

// Reserved status hues — match the badge palette used across orders screens,
// always shown WITH their text label (never color alone). yetkazilmoqda is a
// DEEPER blue than the Doʼkon series blue on purpose: a series color must never
// double as a status color.
const STATUS_COLOR: Record<string, string> = {
  yangi: "#db2777",
  tasdiqlangan: "#d97706",
  yetkazilmoqda: "#1d4ed8",
  yetkazildi: "#16a34a",
  bekor: "#6b7280",
  sotildi: "#0d9488",
  qaytarildi: "#ea580c",
};

const PERIOD_LABEL: Record<Period, string> = {
  today: "Bugun",
  "7d": "Oxirgi 7 kun",
  "30d": "Oxirgi 30 kun",
};

const compact = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
};

// Custom tooltip — formats values as UZS (avoids recharts' strict formatter type).
const MoneyTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  label?: string;
  payload?: { name?: string; value?: number | string; color?: string }[];
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-xs shadow-md">
      {label && <p className="font-semibold text-slate-600 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-slate-600">
          <span className="inline-block size-2 rounded-full mr-1.5 align-middle" style={{ background: p.color }} />
          {p.name}: <b>{FormattedPrice(Number(p.value))} UZS</b>
        </p>
      ))}
    </div>
  );
};

const LegendChip = ({ color, label, value }: { color: string; label: string; value?: string }) => (
  <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
    <span className="size-2.5 rounded-full shrink-0" style={{ background: color }} />
    {label}
    {value !== undefined && <b className="text-slate-700">{value}</b>}
  </span>
);

const panel = "rounded-xl border border-brand-100 bg-white p-4";
const panelTitle = "flex items-baseline justify-between gap-2 mb-3";

// Hisobot grafiklari — the visual half of the reports dashboard. The channel
// trend is a fixed 14-day window (a 1-day "Bugun" trend would be a single bar);
// the donut, status pipeline and finance breakdown follow the period toggle.
const DashboardCharts = ({ period }: { period: Period }) => {
  const { orders, fetchAllOrders } = useOrderStore();
  const { expenses, fetchExpenses } = useExpenseStore();

  useEffect(() => {
    fetchAllOrders();
    fetchExpenses();
  }, [fetchAllOrders, fetchExpenses]);

  const from = period === "today" ? startOfToday() : startOfDaysAgo(period === "7d" ? 7 : 30);

  const trend = useMemo(() => dailyChannelSeries(orders, 14), [orders]);
  const trendHasData = useMemo(() => trend.some((d) => d.web > 0 || d.store > 0), [trend]);

  const channel = useMemo(() => {
    const web = aggregateOrders(orders, { from, channel: "web" });
    const store = aggregateOrders(orders, { from, channel: "store" });
    const total = web.revenue + store.revenue;
    return { web, store, total };
  }, [orders, from]);
  // Rounded shares that always sum to 100 (store takes the complement).
  const webPct = channel.total > 0 ? Math.round((channel.web.revenue / channel.total) * 100) : 0;
  const storePct = channel.total > 0 ? 100 - webPct : 0;

  // Pipeline: EVERY order of the period, including bekor/qaytarildi — this card
  // is about order flow, not money.
  const statusRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of orders) {
      if (!matchesFilter(o, { from, realizedOnly: false })) continue;
      const key = ORDER_STATUSES.find((s) => s.key === o.status)?.key ?? "yangi";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const rows = ORDER_STATUSES
      .map((s) => ({ key: s.key, label: s.label, count: counts.get(s.key) ?? 0 }))
      .filter((r) => r.count > 0);
    const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
    return { rows, max, total: rows.reduce((s, r) => s + r.count, 0) };
  }, [orders, from]);

  const fin = useMemo(() => {
    const all = aggregateOrders(orders, { from });
    let expenseTotal = 0;
    for (const e of expenses) {
      const ms = e.date?.seconds ? e.date.seconds * 1000 : 0;
      if (ms >= from) expenseTotal += Number(e.amount) || 0;
    }
    return { ...all, expenseTotal, net: all.profit - expenseTotal };
  }, [orders, expenses, from]);
  const finRows = useMemo(() => {
    const base = Math.max(fin.revenue, 1); // widths are % of savdo; avoid ÷0
    const rows = [
      { label: "Savdo", value: fin.revenue, color: C_WEB },
      { label: "Tan narx", value: fin.cogs, color: "#94a3b8" },
      { label: "Yalpi foyda", value: fin.profit, color: "#16a34a" },
      { label: "Xarajat", value: fin.expenseTotal, color: "#d97706" },
      { label: "Net foyda", value: fin.net, color: fin.net < 0 ? "#dc2626" : "#16a34a" },
    ];
    return rows.map((r) => ({ ...r, pct: Math.min(100, (Math.abs(r.value) / base) * 100) }));
  }, [fin]);

  const periodLabel = PERIOD_LABEL[period];
  const empty = (msg: string) => (
    <p className="text-sm text-slate-400 text-center py-10">{msg}</p>
  );

  return (
    <div className="px-5 mb-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {/* ---- Savdo dinamikasi: daily revenue stacked by channel ---- */}
        <div className={`${panel} md:col-span-2 xl:col-span-2`}>
          <div className={panelTitle}>
            <h3 className="font-bold text-slate-700">Savdo dinamikasi</h3>
            <span className="text-xs text-slate-400">Oxirgi 14 kun</span>
          </div>
          {trendHasData ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trend} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                  {/* solid faint gridlines — dashing reads as noise */}
                  <CartesianGrid stroke="#f4eeee" vertical={false} />
                  <XAxis dataKey="label" interval={1} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: "#94a3b8" }} width={40} tickLine={false} axisLine={false} />
                  <Tooltip content={<MoneyTooltip />} cursor={{ fill: "rgba(221,36,38,0.06)" }} />
                  {/* white stroke = the surface gap between stacked segments (invisible on the white card) */}
                  <Bar dataKey="web" name="Sayt" stackId="rev" fill={C_WEB} stroke="#fff" strokeWidth={1} maxBarSize={28} />
                  <Bar dataKey="store" name="Doʼkon" stackId="rev" fill={C_STORE} stroke="#fff" strokeWidth={1} maxBarSize={28} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2">
                <LegendChip color={C_WEB} label="Sayt" />
                <LegendChip color={C_STORE} label="Doʼkon (kassa)" />
              </div>
            </>
          ) : (
            empty("Oxirgi 14 kunda sotuv yoʼq — birinchi sotuvdan soʼng grafik shu yerda chiqadi.")
          )}
        </div>

        {/* ---- Kanal ulushi: where the period's revenue came from ---- */}
        <div className={panel}>
          <div className={panelTitle}>
            <h3 className="font-bold text-slate-700">Kanal ulushi</h3>
            <span className="text-xs text-slate-400">{periodLabel}</span>
          </div>
          {channel.total > 0 ? (
            <div className="flex flex-col justify-center h-[calc(100%-2rem)] gap-4">
              {/* Headline: the period's total — the one number this card answers */}
              <div>
                <p className="text-2xl font-bold text-slate-700 leading-none">
                  {FormattedPrice(channel.total)} <span className="text-sm font-medium text-slate-400">UZS</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">davr savdosi, ikki kanal jami</p>
              </div>
              {/* 100% split bar — a two-part share reads best as one divided track */}
              <div>
                <div className="flex h-4 rounded-full overflow-hidden gap-0.5 bg-slate-100">
                  {channel.web.revenue > 0 && (
                    <div style={{ width: `${webPct}%`, background: C_WEB }} title={`Sayt ${webPct}%`} />
                  )}
                  {channel.store.revenue > 0 && (
                    <div style={{ width: `${storePct}%`, background: C_STORE }} title={`Doʼkon ${storePct}%`} />
                  )}
                </div>
                <div className="space-y-1.5 mt-3">
                  <div className="flex items-center justify-between">
                    <LegendChip color={C_WEB} label="Sayt" />
                    <span className="text-xs text-slate-600">
                      <b>{FormattedPrice(channel.web.revenue)}</b> · {webPct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <LegendChip color={C_STORE} label="Doʼkon (kassa)" />
                    <span className="text-xs text-slate-600">
                      <b>{FormattedPrice(channel.store.revenue)}</b> · {storePct}%
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                {channel.web.count + channel.store.count} ta buyurtma: sayt {channel.web.count} · doʼkon{" "}
                {channel.store.count}
              </p>
            </div>
          ) : (
            empty("Bu davrda savdo yoʼq.")
          )}
        </div>

        {/* ---- Buyurtma holatlari: order pipeline for the period ---- */}
        <div className={panel}>
          <div className={panelTitle}>
            <h3 className="font-bold text-slate-700">Buyurtma holatlari</h3>
            <span className="text-xs text-slate-400">{periodLabel}</span>
          </div>
          {statusRows.rows.length > 0 ? (
            <div className="space-y-2.5">
              {statusRows.rows.map((r) => (
                <div key={r.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="size-2.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[r.key] }} />
                      {r.label}
                    </span>
                    <b className="text-slate-700">{r.count}</b>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, (r.count / statusRows.max) * 100)}%`,
                        background: STATUS_COLOR[r.key],
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-slate-400 pt-1">jami {statusRows.total} ta buyurtma</p>
            </div>
          ) : (
            empty("Bu davrda buyurtma yoʼq.")
          )}
        </div>

        {/* ---- Moliyaviy natija: savdo → tan narx → foyda → xarajat → net ---- */}
        <div className={`${panel} md:col-span-2 xl:col-span-4`}>
          <div className={panelTitle}>
            <h3 className="font-bold text-slate-700">Moliyaviy natija</h3>
            <span className="text-xs text-slate-400">{periodLabel} · ulushlar savdoga nisbatan</span>
          </div>
          {fin.revenue > 0 || fin.expenseTotal > 0 ? (
            <div className="space-y-2.5">
              {finRows.map((r) => (
                <div key={r.label} className="grid grid-cols-[92px_1fr_auto] sm:grid-cols-[110px_1fr_auto] items-center gap-3">
                  <span className="text-xs text-slate-500">{r.label}</span>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${r.value !== 0 ? Math.max(1.5, r.pct) : 0}%`, background: r.color }}
                    />
                  </div>
                  <b
                    className={`text-xs whitespace-nowrap ${
                      r.label === "Net foyda" ? (fin.net < 0 ? "text-red-600" : "text-green-600") : "text-slate-700"
                    }`}
                  >
                    {FormattedPrice(r.value)} UZS
                  </b>
                </div>
              ))}
            </div>
          ) : (
            empty("Bu davrda moliyaviy harakat yoʼq.")
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
