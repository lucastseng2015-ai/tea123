export interface TeaProduct {
  id: string;
  name: string;
  description: string;
  priceM: number;
  priceL: number | null; // null if not available
  iceConstraint: string; // e.g. "僅供少冰"
  available: boolean;
  category: string;
  badge?: string; // green or brown dots represent special badges
}

export interface CartItem {
  product: TeaProduct;
  size: "M" | "L";
  sweetness: string;
  ice: string;
  quantity: number;
  notes: string;
  unitPrice: number;
}

export type OrderStatus = "pending" | "preparing" | "completed" | "cancelled";

export interface TeaOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  totalPrice: number;
  status: OrderStatus;
  notes: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface AdminSettings {
  passwordHash: string; // Plain password or representation for security in demo
  createdAt: any;
  updatedAt: any;
}
