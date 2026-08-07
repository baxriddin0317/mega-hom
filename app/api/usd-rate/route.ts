// USD→UZS kurs for the POS — Oʼzbekiston Markaziy banki (cbu.uz) official
// daily rate, fetched server-side (the CBU API has no CORS for browsers) and
// cached for an hour. The till treats this as a PREFILL: the cashier can always
// override the kurs by hand, and the rate actually used is snapshotted on the
// sale, so a stale cache can never silently mis-price a payment.
export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch("https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/", {
      next: { revalidate: 3600 },
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`cbu ${res.status}`);
    const data = (await res.json()) as { Rate?: string; Date?: string }[];
    const rate = Number(String(data?.[0]?.Rate ?? "").replace(",", "."));
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("bad rate");
    return Response.json({ rate, date: data?.[0]?.Date ?? null, source: "CBU" });
  } catch (e) {
    console.error("usd-rate fetch failed:", e);
    // 200 with rate:null — the POS falls back to its last manual kurs; a 5xx
    // here would just add console noise for an expected, handled situation.
    return Response.json({ rate: null, source: null });
  }
}
