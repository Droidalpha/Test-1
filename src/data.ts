import { collection, doc, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Product } from './types';

export const INITIAL_PRODUCTS: Omit<Product, 'id'>[] = [
  {
    name: "Aashirvaad Superior MP Sharbati Whole Wheat Atta",
    category: "Groceries",
    price: 350,
    unit: "5 kg",
    description: "Premium quality wheat flour for soft and fluffy rotis.",
    imageUrl: "https://images.unsplash.com/photo-1627485937980-221c88ce04ea?auto=format&fit=crop&w=600&q=80",
    stock: 50,
    freshness: "Packed recently",
    organic: false,
    rating: 4.8,
    calories: 340,
    protein: 12,
    healthDetails: "High in complex carbohydrates and dietary fiber. Provides sustained energy and essential B-vitamins."
  },
  {
    name: "Organic Toor Dal",
    category: "Groceries",
    price: 180,
    unit: "1 kg",
    description: "Unpolished organic split pigeon peas.",
    imageUrl: "https://images.unsplash.com/photo-1585233156637-233c4c95fdb5?auto=format&fit=crop&w=600&q=80",
    stock: 40,
    freshness: "Harvested recently",
    organic: true,
    rating: 4.7,
    calories: 343,
    protein: 22,
    healthDetails: "Excellent source of plant-based protein and dietary fiber. Rich in iron and folic acid."
  },
  {
    name: "Kashmiri Apples",
    category: "Premium Fruits",
    price: 250,
    unit: "1 kg",
    description: "Sweet, crisp, and farm-fresh premium apples from Kashmir.",
    imageUrl: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80",
    stock: 35,
    freshness: "Harvested 2 days ago",
    organic: true,
    rating: 4.9,
    calories: 52,
    protein: 0.3,
    healthDetails: "Rich in antioxidants, Vitamin C, and fiber. Good for heart health and digestion."
  },
  {
    name: "Pigeon Popcorn Aluminum Pressure Cooker",
    category: "Home & Kitchen",
    price: 1299,
    unit: "3 L",
    description: "Durable aluminum pressure cooker for everyday cooking.",
    imageUrl: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80",
    stock: 15,
    freshness: "New arrival",
    organic: false,
    rating: 4.5
  },
  {
    name: "Men's Solid Cotton Blend Polo T-Shirt",
    category: "Fashion",
    price: 499,
    unit: "1 piece",
    description: "Comfortable and stylish polo t-shirt for daily wear.",
    imageUrl: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=600&q=80",
    stock: 25,
    freshness: "Latest trend",
    organic: false,
    rating: 4.6
  },
  {
    name: "Women's Floral Print Kurta",
    category: "Fashion",
    price: 899,
    unit: "1 piece",
    description: "Elegant floral print straight kurta in breathable fabric.",
    imageUrl: "https://images.unsplash.com/photo-1583391733958-d259779e5962?auto=format&fit=crop&w=600&q=80",
    stock: 20,
    freshness: "New arrival",
    organic: false,
    rating: 4.7
  },
  {
    name: "boAt Rockerz 450 Bluetooth Headphones",
    category: "Electronics",
    price: 1499,
    unit: "1 piece",
    description: "Wireless on-ear headphones with up to 15 hours of playback.",
    imageUrl: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=600&q=80",
    stock: 10,
    freshness: "Brand new",
    organic: false,
    rating: 4.8
  },
  {
    name: "L'Oreal Paris Revitalift Hyaluronic Acid Serum",
    category: "Beauty",
    price: 899,
    unit: "30 ml",
    description: "Anti-aging face serum for radiant and hydrated skin.",
    imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80",
    stock: 18,
    freshness: "Sealed",
    organic: false,
    rating: 4.9
  },
  {
    name: "Gold Plated Kundan Necklace Set",
    category: "Jewellery",
    price: 2499,
    unit: "1 set",
    description: "Traditional designer Kundan necklace set with earrings.",
    imageUrl: "https://images.unsplash.com/photo-1599643478514-4a888f802d33?auto=format&fit=crop&w=600&q=80",
    stock: 5,
    freshness: "Handcrafted",
    organic: false,
    rating: 4.6
  },
  {
    name: "Nivia Classic Football",
    category: "Sports, Toys & Luggage",
    price: 450,
    unit: "Size 5",
    description: "Durable PVC football suitable for hard ground without grass.",
    imageUrl: "https://images.unsplash.com/photo-1614632537197-38a4705f4649?auto=format&fit=crop&w=600&q=80",
    stock: 12,
    freshness: "New",
    organic: false,
    rating: 4.5
  },
  {
    name: "Fresh Spinach Bunch",
    category: "Groceries",
    price: 30,
    unit: "1 bunch",
    description: "Freshly harvested organic spinach.",
    imageUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80",
    stock: 50,
    freshness: "Harvested today",
    organic: true,
    rating: 4.8,
    calories: 23,
    protein: 2.9,
    healthDetails: "Extremely high in Vitamin A, Vitamin C, Iron, and Calcium. Great for immunity and bone health."
  }
];

export async function seedProductsIfEmpty(): Promise<Product[]> {
  const productsCol = collection(db, 'products');
  const snapshot = await getDocs(productsCol);
  
  if (snapshot.empty) {
    console.log("Seeding products to Firestore...");
    const batch = writeBatch(db);
    const seededProducts: Product[] = [];
    
    INITIAL_PRODUCTS.forEach((p, idx) => {
      const docRef = doc(productsCol, `p_${idx + 1}`);
      const fullProduct: Product = {
        id: docRef.id,
        ...p
      };
      batch.set(docRef, fullProduct);
      seededProducts.push(fullProduct);
    });
    
    await batch.commit();
    return seededProducts;
  } else {
    const list: Product[] = [];
    snapshot.forEach(doc => {
      list.push(doc.data() as Product);
    });
    return list;
  }
}

export const SIMULATED_DELIVERY_ROUTE: { lat: number; lng: number }[] = [
  { lat: 100, lng: 100 },
  { lat: 120, lng: 130 },
  { lat: 150, lng: 140 },
  { lat: 180, lng: 110 },
  { lat: 220, lng: 150 },
  { lat: 250, lng: 190 },
  { lat: 290, lng: 160 },
  { lat: 330, lng: 200 },
  { lat: 380, lng: 220 },
  { lat: 400, lng: 250 },
];
