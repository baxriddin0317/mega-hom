import { fireDB } from '@/firebase/FirebaseConfig';
import { CategoryI } from '@/lib/types';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, query } from 'firebase/firestore';
import {create} from 'zustand';

interface CategoryStoreI {
  categories: CategoryI[];
  category: CategoryI | null;
  loading: boolean;
  addCategory: (newCategory: CategoryI) => Promise<void>;
  fetchCategories: () => void;
  fetchSingleCategory: (id: string) => void
  deleteCategory: (categoryId: string) => void;
}

const useCategoryStore = create<CategoryStoreI>((set) => ({
  categories: [],
  category: null,
  loading: false,
  // Add a new category
  addCategory: async (newCategory: CategoryI) => {
    set({ loading: true });
    try {
      const categoryDoc = collection(fireDB, 'categories');
      await addDoc(categoryDoc, newCategory);
      set({ loading: false });
    } catch (error) {
      console.error('Error adding category:', error);
      set({ loading: false });
    }
  },

  // fetch single category with id
  fetchSingleCategory: async (id) => {
    set({loading: true});
    try {
      const categoryDoc = await getDoc(doc(fireDB, 'categories', id));
      const categoryData = categoryDoc.data();

      if (categoryData) {
        set({
          category: {
            id, 
            name: categoryData.name
          } as CategoryI,
          loading: false
        });
      } else {
        set({ loading: false });
        console.error('category not found');
      }
      
      
    } catch (error) {
      
    }
  },

  // Fetch all categories
  fetchCategories: async () => {
    set({ loading: true });
    try {
      const q = query(collection(fireDB, "categories"));
      const unsubscribe = onSnapshot(q, (QuerySnapshot) => {
        let CategoryArray: any = [];
        QuerySnapshot.forEach((doc) => {
          CategoryArray.push({ ...doc.data(), id: doc.id });
        });
        set({ categories: CategoryArray, loading: false });
      });
      return () => unsubscribe(); 
    } catch (error) {
      console.error('Error fetching categories:', error);
      set({ loading: false });
    }
  },

  // delete category with id
  deleteCategory: async (categoryId) => {
    try {
      const categoryRef = doc(fireDB, 'categories', categoryId);
      await deleteDoc(categoryRef);
      set((state) => ({
        categories: state.categories.filter(category => category.id !== categoryId)
      }));
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  }
}))

export default useCategoryStore;