import { ProductT } from '@/lib/types';
import {create} from 'zustand';
import { persist } from 'zustand/middleware';

interface BasketState {
  cartProducts: ProductT[];
  cartProduct: ProductT | null;
  load: boolean;
  totalQuantity: number;
  totalPrice: number;
  addToBasket: (product: ProductT) => void;
  incrementQuantity: (id: string) => void;
  decrementQuantity: (id: string) => void;
  getItemQuantity: (id: string) => number;  
  calculateTotals: () => void;
  clearBasket: () => void; 
}

const useCartProductStore = create<BasketState>()(
  persist(
    (set, get) => ({
      cartProducts: [],
      cartProduct: null,
      load: false, 
      totalQuantity: 0,
      totalPrice: 0,
      
      addToBasket: (product) => {
        set((state) => {
          const existingItem = state.cartProducts.find((item) => item.id === product.id);
          
          if (existingItem) {
            return {
              cartProducts: state.cartProducts.map((item) =>
                item.id === product.id ? { ...item, quantity: product.quantity } : item
              ),
            };
          } else {
            return { cartProducts: [...state.cartProducts, { ...product, quantity: product.quantity }] };
          }
        });
      },
      
      incrementQuantity: (id) => {
        set((state) => ({
          cartProducts: state.cartProducts.map((item) =>
            item.id === id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        }));
      },
      
      decrementQuantity: (id) => {
        set((state) => {
          const item = state.cartProducts.find((item) => item.id === id);
          if (!item) return state;

          // If quantity is 1, remove the item from the basket
          if (item.quantity === 1) {
            return { cartProducts: state.cartProducts.filter((item) => item.id !== id) };
          }

          // Otherwise, decrease the quantity
          const newBasket = state.cartProducts.map((item) =>
            item.id === id ? { ...item, quantity: item.quantity - 1 } : item
          );
          return { cartProducts: newBasket };
        });
      },
      
      getItemQuantity: (id) => {
        const item = get().cartProducts.find((item) => item.id === id);
        return item ? item.quantity : 1;
      },

      calculateTotals: () => {
        const totalQuantity = get().cartProducts.reduce((acc, item) => acc + item.quantity, 0);
        const totalPrice = get().cartProducts.reduce((acc, item) => acc + item.price * item.quantity, 0);
        set({ totalQuantity, totalPrice });
      },

      clearBasket: () => {
        set({ cartProducts: [], totalQuantity: 0, totalPrice: 0 });
        localStorage.removeItem("basket-storage");
      },
    }),
    {
      name: 'basket-storage', 
    }
  )
);
export default useCartProductStore;