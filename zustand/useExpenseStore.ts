import { create } from "zustand";
import { collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import { Expense } from "@/lib/types";

export interface ExpenseInput {
  title: string;
  amount: number;
  category: string;
  note?: string;
  actorUid: string;
  actorName: string;
}

interface ExpenseState {
  expenses: Expense[];
  loading: boolean;
  fetchExpenses: () => void;
  addExpense: (input: ExpenseInput) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

// Module-scoped so the subscription is shared across every component that asks
// for expenses, exactly like productsUnsub/ordersUnsub in the sibling stores.
let expensesUnsub: (() => void) | null = null;

const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: [],
  loading: true,

  // One shared listener for the whole app (module-scoped), matching every other
  // store. Without the guard each caller opened its own onSnapshot and threw the
  // unsubscribe away — and the dashboard mounts TWO callers side by side
  // (DashboardKPIs + DashboardCharts), so every visit stacked another live
  // listener on `expenses` that was never torn down.
  fetchExpenses: () => {
    if (expensesUnsub) return;
    set({ loading: true });
    const q = query(collection(fireDB, "expenses"), orderBy("date", "desc"));
    expensesUnsub = onSnapshot(
      q,
      (snap) => {
        const list: Expense[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as Expense), id: d.id }));
        set({ expenses: list, loading: false });
      },
      (err) => {
        console.error("expenses subscription error:", err);
        set({ loading: false });
      }
    );
  },

  addExpense: async ({ title, amount, category, note, actorUid, actorName }) => {
    await addDoc(collection(fireDB, "expenses"), {
      title: title.trim(),
      amount: Number(amount) || 0,
      category,
      note: note?.trim() || "",
      actorUid,
      actorName,
      date: new Date(),
    });
  },

  deleteExpense: async (id: string) => {
    await deleteDoc(doc(fireDB, "expenses", id));
  },
}));

export default useExpenseStore;
