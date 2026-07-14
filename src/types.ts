export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  description: string;
  imageUrl: string;
  stock: number;
  freshness: string;
  organic: boolean;
  rating: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus = 'ordered' | 'preparing' | 'transit' | 'delivered';

export interface DriverCoords {
  lat: number;
  lng: number;
  heading: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: CartItem[];
  totalAmount: number;
  status: OrderStatus;
  driverCoords: DriverCoords | null;
  createdAt: any; // Firestore Timestamp
  estimatedDelivery: string;
}
