import { collection, doc, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Product } from './types';

export const INITIAL_PRODUCTS: Omit<Product, 'id'>[] = [
  {
    name: "Organic Honeycrisp Apples",
    category: "Fruits",
    price: 3.49,
    unit: "lb",
    description: "Crisp, sweet, and locally grown at Orchard Hill Farms. Freshly picked this morning.",
    imageUrl: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80",
    stock: 45,
    freshness: "Harvested 6h ago",
    organic: true,
    rating: 4.9
  },
  {
    name: "Heirloom Beefsteak Tomatoes",
    category: "Vegetables",
    price: 2.99,
    unit: "lb",
    description: "Juicy, full-flavored multi-colored heirloom tomatoes. Perfect for summer salads and sandwiches.",
    imageUrl: "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=600&q=80",
    stock: 30,
    freshness: "Harvested 4h ago",
    organic: true,
    rating: 4.8
  },
  {
    name: "Fresh Baby Spinach Bunch",
    category: "Greens",
    price: 1.89,
    unit: "bunch",
    description: "Tender, iron-rich spinach leaves washed and tied. Grown soil-free in local hydro-farms.",
    imageUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80",
    stock: 25,
    freshness: "Harvested 5h ago",
    organic: true,
    rating: 4.7
  },
  {
    name: "Organic Sweet Blueberries",
    category: "Fruits",
    price: 4.99,
    unit: "pint",
    description: "Plump, sweet, and rich in antioxidants. Perfect for breakfast bowls or snacking.",
    imageUrl: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=600&q=80",
    stock: 18,
    freshness: "Harvested yesterday",
    organic: true,
    rating: 4.95
  },
  {
    name: "Farm-Fresh Free Range Eggs",
    category: "Dairy & Farm",
    price: 5.49,
    unit: "dozen",
    description: "Pasture-raised organic brown eggs from sunny Meadow Farms. Rich golden yolks.",
    imageUrl: "https://images.unsplash.com/photo-1516448424440-5db5971a90ee?auto=format&fit=crop&w=600&q=80",
    stock: 20,
    freshness: "Laid yesterday",
    organic: true,
    rating: 4.9
  },
  {
    name: "Local Raw Clover Honey",
    category: "Pantry",
    price: 8.99,
    unit: "jar",
    description: "Unfiltered, unpasteurized honey harvested straight from bee hives in the north valley.",
    imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80",
    stock: 15,
    freshness: "Jarred last week",
    organic: false,
    rating: 5.0
  },
  {
    name: "Artisanal Country Sourdough",
    category: "Bakery",
    price: 6.50,
    unit: "loaf",
    description: "Naturally leavened sourdough bread baked in wood-fired stone ovens by Rise Bakery.",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
    stock: 12,
    freshness: "Baked at 4:00 AM",
    organic: false,
    rating: 4.85
  },
  {
    name: "Fresh Rosemary Bunch",
    category: "Herbs",
    price: 1.49,
    unit: "bunch",
    description: "Highly aromatic woody rosemary stalks. Hand-picked at the Riverside herb garden.",
    imageUrl: "https://images.unsplash.com/photo-1515589654462-a9881e276b8a?auto=format&fit=crop&w=600&q=80",
    stock: 35,
    freshness: "Picked 3h ago",
    organic: true,
    rating: 4.7
  },
  {
    name: "Organic Hass Avocados",
    category: "Fruits",
    price: 1.99,
    unit: "each",
    description: "Perfectly creamy avocados with dark pebbled skin. Ready to eat in 1-2 days.",
    imageUrl: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80",
    stock: 40,
    freshness: "Imported fresh",
    organic: true,
    rating: 4.6
  },
  {
    name: "Crisp Orange Carrots Bunch",
    category: "Vegetables",
    price: 2.29,
    unit: "bunch",
    description: "Sweet, crunchy carrots with vibrant green tops still attached. Great for juicing.",
    imageUrl: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80",
    stock: 28,
    freshness: "Harvested 8h ago",
    organic: true,
    rating: 4.75
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

// Simulated delivery route coords
// Let's create a beautiful path of ~10 key checkpoints on our custom map
export const SIMULATED_DELIVERY_ROUTE: { lat: number; lng: number }[] = [
  { lat: 100, lng: 100 }, // Warehouse / Market
  { lat: 120, lng: 130 },
  { lat: 150, lng: 140 },
  { lat: 180, lng: 110 },
  { lat: 220, lng: 150 },
  { lat: 250, lng: 190 },
  { lat: 290, lng: 160 },
  { lat: 330, lng: 200 },
  { lat: 380, lng: 220 },
  { lat: 400, lng: 250 }, // User Residence
];
