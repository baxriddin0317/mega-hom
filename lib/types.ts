import { Timestamp } from "firebase/firestore";

export interface ProductT {
  id: string;
  title: string;
  price: number;
  productImageUrl: ImageT[];
  category: string;
  subCategory:string;
  description: string;
  quantity: number;
  isBest: boolean;
  isNew: boolean
  time: Timestamp;
  date: Timestamp;
  storageFileId: string;
}

export interface CategoryI {
  id: string;
  name: string;
  subcategory: string[]
}

export interface ImageT {
  url: string;
  path: string;
}

export interface Order {
  id: string;
  clientName: string;
  clientLastName: string;
  clientPhone: string;
  date: Timestamp;
  basketItems: ProductT[];
  totalPrice: number;
  totalQuantity: number;
}

export interface  userT {
  name: string;
  email: string | null;
  uid: string;
  role: string;
  time: Timestamp;
  date: string;
}