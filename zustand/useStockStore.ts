import { create } from "zustand";
import {
  collection,
  doc,
  writeBatch,
  increment,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  FieldValue,
} from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import { ProductT, StockMovement, StockMovementType } from "@/lib/types";

export interface MovementInput {
  product: ProductT;
  type: StockMovementType; // kirim (+), chiqim (−), tuzatish (set)
  qty: number;             // positive magnitude entered by the user
  reason: string;
  supplierName?: string;   // kirim: which supplier supplied the goods
  actorUid: string;
  actorName: string;
}

// One line of a receiving document (Kirim — tovar qabul qilish).
export interface ReceiveLine {
  product: ProductT;
  qty: number;      // units received (positive)
  unitCost: number; // per-unit purchase cost; 0 = not entered
}
export interface ReceiveInput {
  lines: ReceiveLine[];
  supplierName: string;
  note: string;
  docNo: string;      // shared receiving reference (KR-…) stamped on every row
  updateCost: boolean; // write entered unit cost into products.costPrice
  actorUid: string;
  actorName: string;
}

interface StockState {
  movements: StockMovement[];
  loading: boolean;
  fetchMovements: () => void;
  applyMovement: (input: MovementInput) => Promise<void>;
  receiveGoods: (input: ReceiveInput) => Promise<void>;
  logCorrection: (input: {
    productId: string;
    productTitle: string;
    oldQty: number;
    newQty: number;
    reason: string;
    actorUid: string;
    actorName: string;
    /** Ledger label: "tuzatish" (default) for edits, "kirim" for initial stock. */
    type?: "kirim" | "tuzatish";
    unitCost?: number;
  }) => Promise<void>;
}

// Shared, app-wide live ledger listener (module-scoped) — one subscription.
let movementsUnsub: (() => void) | null = null;

const useStockStore = create<StockState>((set) => ({
  movements: [],
  loading: true,

  // Live ledger, newest first (capped so the page never loads the whole history).
  fetchMovements: () => {
    if (movementsUnsub) return; // reuse the one shared subscription
    set({ loading: true });
    const q = query(collection(fireDB, "stockMovements"), orderBy("createdAt", "desc"), limit(300));
    movementsUnsub = onSnapshot(
      q,
      (snap) => {
        const list: StockMovement[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as StockMovement), id: d.id }));
        set({ movements: list, loading: false });
      },
      (err) => {
        console.error("stockMovements subscription error:", err);
        set({ loading: false });
      }
    );
  },

  // Atomically move stock AND append the ledger row, so on-hand and its history
  // can never drift apart. kirim adds, chiqim subtracts (floored at 0),
  // tuzatish sets the absolute counted quantity.
  applyMovement: async ({ product, type, qty, reason, supplierName, actorUid, actorName }) => {
    const current = Number(product.quantity) || 0;
    const magnitude = Math.abs(Number(qty) || 0);
    let newQty = current;
    if (type === "kirim") newQty = current + magnitude;
    else if (type === "chiqim") newQty = Math.max(0, current - magnitude);
    else if (type === "tuzatish") newQty = magnitude;
    const delta = newQty - current;

    const batch = writeBatch(fireDB);
    batch.update(doc(fireDB, "products", product.id), { quantity: newQty });
    batch.set(doc(collection(fireDB, "stockMovements")), {
      productId: product.id,
      productTitle: product.title ?? "",
      type,
      delta,
      newQty,
      reason: reason.trim(),
      supplierName: type === "kirim" ? supplierName?.trim() || "" : "",
      actorUid,
      actorName,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  },

  // Commit a whole receiving document (Kirim) atomically: every line increments
  // its product's on-hand (increment() — concurrency-safe against a POS sale
  // landing mid-receive), optionally refreshes tan narx to the entered unit
  // cost, and appends a "kirim" ledger row stamped with the shared doc no +
  // supplier so the history reads like a proper qabul akti.
  receiveGoods: async ({ lines, supplierName, note, docNo, updateCost, actorUid, actorName }) => {
    const clean = lines.filter((l) => l.product?.id && Math.floor(l.qty) > 0);
    if (clean.length === 0) throw new Error("empty");
    // 2 writes per line; stay far under Firestore's 500-op batch cap.
    if (clean.length > 150) throw new Error("too-many-lines");
    const batch = writeBatch(fireDB);
    for (const l of clean) {
      const qty = Math.floor(l.qty);
      const cost = Math.max(0, Number(l.unitCost) || 0);
      const patch: { quantity: FieldValue; costPrice?: number } = { quantity: increment(qty) };
      if (updateCost && cost > 0 && cost !== (Number(l.product.costPrice) || 0)) {
        patch.costPrice = cost;
      }
      batch.update(doc(fireDB, "products", l.product.id), patch);
      batch.set(doc(collection(fireDB, "stockMovements")), {
        productId: l.product.id,
        productTitle: l.product.title ?? "",
        type: "kirim",
        delta: qty,
        newQty: (Number(l.product.quantity) || 0) + qty, // estimate for display
        reason: note.trim() || "Tovar qabul qilindi",
        supplierName: supplierName.trim(),
        unitCost: cost,
        orderNo: docNo,
        actorUid,
        actorName,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  },

  // Append ONLY a ledger row for a quantity change whose product write happens
  // elsewhere (the product edit form saves the whole doc; add-product creates
  // it with initial stock). Keeps every stock change visible in Ombor →
  // Harakatlar instead of silently vanishing.
  logCorrection: async ({ productId, productTitle, oldQty, newQty, reason, actorUid, actorName, type, unitCost }) => {
    const batch = writeBatch(fireDB);
    batch.set(doc(collection(fireDB, "stockMovements")), {
      productId,
      productTitle,
      type: type ?? "tuzatish",
      delta: newQty - oldQty,
      newQty,
      reason,
      supplierName: "",
      unitCost: Math.max(0, Number(unitCost) || 0),
      actorUid,
      actorName,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  },
}));

export default useStockStore;
