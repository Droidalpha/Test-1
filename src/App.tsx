import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Check,
  ChevronRight,
  User,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  Truck,
  Package,
  CheckCircle,
  RefreshCw,
  X,
  Play,
  RotateCcw,
  Sliders,
  TrendingDown,
  Shield,
  Store,
  Compass,
  Clipboard,
  Download,
  Heart
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const generatePriceHistory = (currentPrice: number, productId: string) => {
  const history = [];
  const days = ['6d ago', '5d ago', '4d ago', '3d ago', '2d ago', '1d ago', 'Today'];
  const seed = productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  for (let i = 0; i < 7; i++) {
    const randomPercent = ((seed + i * 13) % 13 - 6) / 100;
    const price = Math.round(currentPrice * (1 + randomPercent) * 100) / 100;
    history.push({
      day: days[i],
      price: i === 6 ? currentPrice : price
    });
  }
  return history;
};
import { db } from './firebase';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { Product, CartItem, Order, OrderStatus, DriverCoords } from './types';
import DeliveryMap from './components/DeliveryMap';
import AssistantPanel from './components/AssistantPanel';
import OwnerView from './components/OwnerView';
import DeliveryView from './components/DeliveryView';
import AdminView from './components/AdminView';
import { INITIAL_PRODUCTS } from './data';

export default function App() {
  // Current active dashboard perspective
  const [currentRole, setCurrentRole] = useState<'customer' | 'owner' | 'rider' | 'admin'>('customer');

  // Real-time synchronization states
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  // Customer states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutStep, setCheckoutStep] = useState<'shopping' | 'checkout'>('shopping');

  // Checkout inputs (hydrated from localStorage to represent current customer identity persistence)
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('customer_name') || '');
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem('customer_phone') || '');
  const [deliveryAddress, setDeliveryAddress] = useState(() => localStorage.getItem('customer_address') || '');

  // Persistent registry of orders placed by this device to identify historical items
  const [placedOrderIds, setPlacedOrderIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('placed_order_ids') || '[]');
    } catch {
      return [];
    }
  });

  // Action status message state for order history feedback
  const [historyNotification, setHistoryNotification] = useState<string | null>(null);

  // Active customer tracking order ID
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => localStorage.getItem('active_order_id'));
  const [selectedProductForAI, setSelectedProductForAI] = useState<Product | null>(null);

  // Derive current customer active tracking order from the real-time orders list
  const activeOrder = orders.find((o) => o.id === activeOrderId) || null;

  // Sync products from Firestore in real-time
  useEffect(() => {
    const initProducts = async () => {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.success && products.length === 0) {
          setProducts(data.products);
        }
      } catch (err) {
        console.error("Error seeding products from api:", err);
      } finally {
        setLoadingProducts(false);
      }
    };

    initProducts();

    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id } as Product);
      });
      if (list.length > 0) {
        setProducts(list);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync ALL orders from Firestore in real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id } as Order);
      });
      setOrders(list);
    });

    return () => unsubscribe();
  }, []);

  // Sync active tracking session if order gets deleted or completed
  useEffect(() => {
    if (activeOrderId && orders.length > 0) {
      const exists = orders.some((o) => o.id === activeOrderId);
      if (!exists) {
        setActiveOrderId(null);
        localStorage.removeItem('active_order_id');
      }
    }
  }, [orders, activeOrderId]);

  // Persist user context profile in local storage
  useEffect(() => {
    localStorage.setItem('customer_name', customerName);
  }, [customerName]);

  useEffect(() => {
    localStorage.setItem('customer_phone', customerPhone);
  }, [customerPhone]);

  useEffect(() => {
    localStorage.setItem('customer_address', deliveryAddress);
  }, [deliveryAddress]);

  // Adjust stock values in real-time
  const handleAdjustStock = async (prodId: string, value: number) => {
    try {
      const prodRef = doc(db, 'products', prodId);
      await updateDoc(prodRef, { stock: value });
    } catch (err) {
      console.error("Failed to adjust stock in Firestore:", err);
    }
  };

  // Add item to shopping basket
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    setSelectedProductForAI(product);
  };

  const updateQuantity = (productId: string, delta: number) => {
    const updated = cart.map((item) => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[];
    setCart(updated);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Calculate average calories and protein for each category to determine "Healthy Choice"
  const categoryNutritionAverages = useMemo(() => {
    const totals: Record<string, { totalCalories: number; totalProtein: number; count: number }> = {};
    
    products.forEach((p) => {
      if (p.calories !== undefined && p.protein !== undefined) {
        if (!totals[p.category]) {
          totals[p.category] = { totalCalories: 0, totalProtein: 0, count: 0 };
        }
        totals[p.category].totalCalories += p.calories;
        totals[p.category].totalProtein += p.protein;
        totals[p.category].count += 1;
      }
    });

    const averages: Record<string, { avgCalories: number; avgProtein: number }> = {};
    Object.entries(totals).forEach(([cat, data]) => {
      if (data.count > 0) {
        averages[cat] = {
          avgCalories: data.totalCalories / data.count,
          avgProtein: data.totalProtein / data.count,
        };
      }
    });

    let globalCalSum = 0;
    let globalProtSum = 0;
    let globalCount = 0;
    products.forEach((p) => {
      if (p.calories !== undefined && p.protein !== undefined) {
        globalCalSum += p.calories;
        globalProtSum += p.protein;
        globalCount += 1;
      }
    });
    
    const globalAvgCal = globalCount > 0 ? globalCalSum / globalCount : 180;
    const globalAvgProt = globalCount > 0 ? globalProtSum / globalCount : 6;

    return {
      averages,
      globalAvg: { avgCalories: globalAvgCal, avgProtein: globalAvgProt }
    };
  }, [products]);

  const checkIfHealthyChoice = (product: Product) => {
    if (product.calories === undefined || product.protein === undefined) return false;
    
    const cat = product.category;
    const catAvg = categoryNutritionAverages.averages[cat];
    
    const categoryFoodItemsCount = products.filter(p => p.category === cat && p.calories !== undefined).length;
    const avgCal = (catAvg && categoryFoodItemsCount > 1) 
      ? catAvg.avgCalories 
      : categoryNutritionAverages.globalAvg.avgCalories;
      
    const avgProt = (catAvg && categoryFoodItemsCount > 1) 
      ? catAvg.avgProtein 
      : categoryNutritionAverages.globalAvg.avgProtein;

    const isLowCalorie = product.calories <= avgCal;
    const isHighProtein = product.protein >= avgProt || (product.protein / product.calories) > (avgProt / avgCal);
    
    return isLowCalorie && isHighProtein;
  };

  // Place order as Customer
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deliveryAddress || cart.length === 0) return;

    try {
      const orderData = {
        customerName,
        customerPhone,
        deliveryAddress,
        items: cart,
        totalAmount: cartTotal,
        status: 'ordered' as OrderStatus,
        driverCoords: null,
        createdAt: new Date().toISOString(),
        estimatedDelivery: '12-18 Mins',
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Reduce stocks
      for (const item of cart) {
        const prodRef = doc(db, 'products', item.product.id);
        const newStock = Math.max(0, item.product.stock - item.quantity);
        await updateDoc(prodRef, { stock: newStock });
      }

      // Activate live tracking
      setActiveOrderId(docRef.id);
      localStorage.setItem('active_order_id', docRef.id);

      // Store in device's order history
      const updatedPlacedIds = [...placedOrderIds, docRef.id];
      setPlacedOrderIds(updatedPlacedIds);
      localStorage.setItem('placed_order_ids', JSON.stringify(updatedPlacedIds));

      // Clear basket states
      setCart([]);
      setCheckoutStep('shopping');
    } catch (err) {
      console.error("Failed to place customer order:", err);
    }
  };

  // Reset active customer tracking demo order
  const handleResetOrder = async () => {
    if (activeOrderId) {
      try {
        await deleteDoc(doc(db, 'orders', activeOrderId));
      } catch (err) {
        console.warn("Could not delete doc from firestore:", err);
      }
      setActiveOrderId(null);
      localStorage.removeItem('active_order_id');
    }
  };

  // Factory reset administrative state
  const handleResetDatabase = async () => {
    try {
      // 1. Delete all current orders
      const ordersCol = collection(db, 'orders');
      const ordersSnap = await getDocs(ordersCol);
      const batch1 = writeBatch(db);
      ordersSnap.forEach((doc) => {
        batch1.delete(doc.ref);
      });
      await batch1.commit();

      // 2. Delete all current products
      const productsCol = collection(db, 'products');
      const productsSnap = await getDocs(productsCol);
      const batch2 = writeBatch(db);
      productsSnap.forEach((doc) => {
        batch2.delete(doc.ref);
      });
      await batch2.commit();

      // 3. Reseed default products
      const batch3 = writeBatch(db);
      INITIAL_PRODUCTS.forEach((p, idx) => {
        const docRef = doc(productsCol, `p_${idx + 1}`);
        batch3.set(docRef, { id: docRef.id, ...p });
      });
      await batch3.commit();

      // Reset client states
      setCart([]);
      setActiveOrderId(null);
      localStorage.removeItem('active_order_id');
    } catch (err) {
      console.error("Database factory reset failed:", err);
      throw err;
    }
  };

  // Filter products by category and search query
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filter historical completed orders for current device/customer
  const completedUserOrders = orders.filter((o) => {
    if (o.status !== 'delivered') return false;

    const isPlacedByThisDevice = placedOrderIds.includes(o.id);
    const matchesPhone = customerPhone.trim() !== '' && o.customerPhone && o.customerPhone.trim() === customerPhone.trim();
    const matchesName = customerName.trim() !== '' && o.customerName && o.customerName.toLowerCase().trim() === customerName.toLowerCase().trim();

    return isPlacedByThisDevice || matchesPhone || matchesName;
  });

  // Sort completed orders to show the most recent first
  const sortedCompletedOrders = [...completedUserOrders].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  // Reorder items: merge historical items into the current shopping cart
  const handleReorder = (items: CartItem[]) => {
    const updatedCart = [...cart];
    items.forEach((pastItem) => {
      const existingIdx = updatedCart.findIndex((item) => item.product.id === pastItem.product.id);
      if (existingIdx > -1) {
        updatedCart[existingIdx].quantity += pastItem.quantity;
      } else {
        updatedCart.push({ product: pastItem.product, quantity: pastItem.quantity });
      }
    });
    setCart(updatedCart);
    
    // Set checkoutStep back to shopping catalog to view updated basket
    setCheckoutStep('shopping');
    
    // Trigger success notification
    setHistoryNotification("🛒 Past order items copied to your shopping basket successfully!");
    setTimeout(() => {
      setHistoryNotification(null);
    }, 4500);
  };

  const categories = ['All', 'Groceries', 'Premium Fruits', 'Home & Kitchen', 'Fashion', 'Electronics', 'Beauty', 'Jewellery', 'Sports, Toys & Luggage'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-200">
      
      {/* COMPREHENSIVE HEADER WITH PORTAL SWITCHER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3 select-none shrink-0">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-display flex items-center gap-1.5 leading-none">
                ALPHAMART
              </h1>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">Your one-stop daily essentials store</p>
            </div>
          </div>

          {/* ACTIVE ROLE SWITCHER NAVIGATION TABS */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 select-none max-w-full overflow-x-auto shrink-0 scrollbar-none">
            <button
              onClick={() => setCurrentRole('customer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                currentRole === 'customer'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>🛒 Customer View</span>
            </button>
            <button
              onClick={() => setCurrentRole('owner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                currentRole === 'owner'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>🏪 Shop Inventory</span>
            </button>
            <button
              onClick={() => setCurrentRole('rider')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                currentRole === 'rider'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>🚴 Rider App</span>
            </button>
            <button
              onClick={() => setCurrentRole('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                currentRole === 'admin'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>⚙️ Admin Panel</span>
            </button>
          </div>

          {/* Action / Status area */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => alert('App download will start shortly!')}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download App</span>
            </button>
            <div className="hidden lg:flex items-center gap-4 shrink-0">
              {currentRole === 'customer' && !activeOrderId && (
                <motion.div
                  key={totalItems}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 15 }}
                  className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-full border border-emerald-100 text-xs font-semibold flex items-center gap-1.5"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Basket: ₹{cartTotal.toFixed(2)}</span>
                </motion.div>
              )}
              {activeOrderId && (
                <div className="bg-amber-50 text-amber-800 px-3 py-1.5 rounded-full border border-amber-100 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                  <Truck className="w-4 h-4" />
                  <span>Delivery Active</span>
                </div>
              )}
              <div className="flex flex-col items-end text-right">
                <span className="text-[9px] text-indigo-600 uppercase font-black tracking-wider">Connected Live</span>
                <span className="text-[10px] text-slate-400 font-semibold">{orders.length} orders tracked</span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* RENDER ACTIVE APP VIEW PERSPECTIVES */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        
        {/* 1. CUSTOMER SHOPPING VIEW */}
        {currentRole === 'customer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            
            {/* LEFT COLUMN: ACTIVE SESSIONS OR DAILY PRODUCE CATALOG (8/12 widths) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {activeOrderId ? (
                /* LIVE ORDER TRACKING SUBSECTION */
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm"
                  id="order-tracking-panel"
                >
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 font-display">Real-time Delivery Status</h2>
                      <p className="text-xs text-slate-500 mt-1">Order ID: <span className="font-mono text-emerald-700 font-bold">{activeOrderId.slice(0, 8)}...</span></p>
                    </div>
                    <button
                      onClick={handleResetOrder}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold px-3 py-1.5 rounded-lg border border-red-100 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Cancel / Clear Tracking
                    </button>
                  </div>

                  {/* DYNAMIC PROGRESS TIMELINE BAR */}
                  <div className="grid grid-cols-4 gap-2 mb-8 relative">
                    <div className="flex flex-col items-center text-center z-10">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        activeOrder ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Package className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-900 mt-2 font-display">1. Confirmed</span>
                      <span className="text-[9px] text-slate-400 font-sans mt-0.5">Order received</span>
                    </div>

                    <div className="flex flex-col items-center text-center z-10">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        activeOrder && (activeOrder.status === 'preparing' || activeOrder.status === 'transit' || activeOrder.status === 'delivered')
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-900 mt-2 font-display">2. Packing</span>
                      <span className="text-[9px] text-slate-400 font-sans mt-0.5">Freshly handpicked</span>
                    </div>

                    <div className="flex flex-col items-center text-center z-10">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        activeOrder && (activeOrder.status === 'transit' || activeOrder.status === 'delivered')
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-400 animate-pulse'
                      }`}>
                        <Truck className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-900 mt-2 font-display">3. On the Way</span>
                      <span className="text-[9px] text-slate-400 font-sans mt-0.5">GPS Dispatch active</span>
                    </div>

                    <div className="flex flex-col items-center text-center z-10">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        activeOrder && activeOrder.status === 'delivered'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-900 mt-2 font-display">4. Delivered</span>
                      <span className="text-[9px] text-slate-400 font-sans mt-0.5">At your door</span>
                    </div>

                    <div className="absolute top-4.5 left-10 right-10 h-0.5 bg-slate-100 -z-0">
                      <div 
                        className="h-full bg-emerald-600 transition-all duration-1000"
                        style={{
                          width: activeOrder?.status === 'ordered' ? '0%' :
                                 activeOrder?.status === 'preparing' ? '33.33%' :
                                 activeOrder?.status === 'transit' ? '66.66%' :
                                 activeOrder?.status === 'delivered' ? '100%' : '0%'
                        }}
                      />
                    </div>
                  </div>

                  {/* ACTIVE DELIVERY SVG NEIGHBORHOOD MAP */}
                  <div className="mb-6">
                    <DeliveryMap status={activeOrder?.status ?? 'ordered'} driverCoords={activeOrder?.driverCoords ?? null} />
                  </div>

                  {/* ORDER LOGISTICS SUMMARY */}
                  {activeOrder ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase font-sans tracking-wide">Recipient Details</h3>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                          <User className="w-4 h-4 text-emerald-600" />
                          <span>{activeOrder.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Phone className="w-4 h-4 text-emerald-600" />
                          <span>{activeOrder.customerPhone}</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-slate-600">
                          <MapPin className="w-4 h-4 text-emerald-600 mt-0.5" />
                          <span className="leading-tight">{activeOrder.deliveryAddress}</span>
                        </div>
                      </div>

                      <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-200/50 pt-3 md:pt-0 md:pl-4 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase font-sans tracking-wide">Items Shipped</h3>
                          <div className="text-xs text-slate-600 mt-1">
                            {activeOrder.items.length} items from farmstead catalog
                          </div>
                          <div className="text-sm font-extrabold text-slate-950 mt-1 font-display">
                            Total Paid: ₹{activeOrder.totalAmount.toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="text-[10px] bg-slate-200/60 text-slate-700 p-2 rounded-lg font-medium flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-600" />
                          <span>Status: {activeOrder.status === 'transit' ? '🚙 Rider is moving down streets' : activeOrder.status === 'delivered' ? '🏡 Arrived and Delivered!' : '🛒 Shop Owner is preparing items'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Syncing active delivery...</p>
                  )}

                  {activeOrder?.status === 'ordered' && (
                    <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                      <div className="max-w-md">
                        <h4 className="text-xs font-bold text-emerald-950 font-display flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-600 animate-bounce-slow" />
                          Watch the Live Movement!
                        </h4>
                        <p className="text-[10px] text-emerald-800 mt-0.5">
                          Switch to the **Rider App** at the top tab to accept this order, enter transit, and broadcast GPS street coordinates!
                        </p>
                      </div>
                      <button
                        onClick={() => setCurrentRole('rider')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all shrink-0"
                      >
                        Go to Rider App
                      </button>
                    </div>
                  )}

                </motion.div>
              ) : (
                /* FRESH PRODUCE BROWSING DIRECTORY */
                <div className="flex flex-col gap-6">
                  
                  {/* Farm Promo Banner */}
                  <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-3xl p-6 relative overflow-hidden shadow-md">
                    <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-emerald-800/15 rounded-full blur-3xl" />
                    <div className="absolute -left-12 -top-12 w-48 h-48 bg-emerald-800/10 rounded-full blur-2xl" />

                    <div className="relative z-10 max-w-lg">
                      <span className="px-2.5 py-1 bg-emerald-850 text-emerald-300 rounded-full text-[9px] font-bold tracking-wider uppercase font-mono border border-emerald-700">
                        Mega Deals: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                      
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3 font-display leading-tight">
                        Everything you need, delivered fresh to your door.
                      </h2>
                      <p className="text-xs text-emerald-200 mt-2 font-sans leading-relaxed">
                        Groceries, electronics, fashion, and more. Test our unique multi-role system by swapping perspectives!
                      </p>
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                    <div className="relative">
                      <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search honeycrisp apples, beefsteak tomatoes, fresh greens..."
                        className="w-full bg-slate-50 border border-slate-150 rounded-xl py-3 pl-11 pr-4 text-xs font-medium focus:outline-hidden focus:border-emerald-300 focus:bg-white transition-colors"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto pb-1 select-none scrollbar-none">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            selectedCategory === cat
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Listings Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-900 tracking-wide uppercase font-display">
                        {selectedCategory} Catalog ({filteredProducts.length})
                      </h3>
                      <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-bold">
                        Stock Real-time Synchronized
                      </span>
                    </div>

                    {loadingProducts ? (
                      <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 select-none">
                        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                        <span className="text-xs text-slate-500 font-semibold">Aligning catalog...</span>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                        <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <h4 className="text-xs font-bold text-slate-700">No Farm Produce Found</h4>
                        <p className="text-[10px] text-slate-400 mt-1">Try resetting the database in Admin tab or adjusting search keywords.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" id="products-grid">
                        <AnimatePresence>
                          {filteredProducts.map((product) => (
                            <motion.div
                              layout
                              key={product.id}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className="bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 p-4 transition-all shadow-xs hover:shadow-md flex flex-col justify-between group relative"
                            >
                              <div className="absolute top-6 left-6 z-10 flex flex-col gap-1 items-start">
                                {product.organic && (
                                  <span className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-extrabold rounded shadow-xs uppercase tracking-wide">
                                    Organic
                                  </span>
                                )}
                                {checkIfHealthyChoice(product) && (
                                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-extrabold rounded shadow-xs uppercase tracking-wide flex items-center gap-1">
                                    <Heart className="w-2.5 h-2.5 fill-white text-white" />
                                    Healthy Choice
                                  </span>
                                )}
                                <span className="px-2 py-0.5 bg-white/90 backdrop-blur-xs text-slate-700 text-[9px] font-bold rounded shadow-xs border border-slate-100">
                                  {product.freshness}
                                </span>
                              </div>

                              <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-50 border border-slate-100 relative">
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                {product.stock === 0 && (
                                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center">
                                    <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded shadow-xs">
                                      Out of Stock
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 flex-1 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans font-semibold">
                                    <span>{product.category}</span>
                                    <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/60">★ {product.rating.toFixed(2)}</span>
                                  </div>
                                  <h4 className="text-xs font-bold text-slate-900 mt-1 group-hover:text-emerald-700 transition-colors font-display line-clamp-1">
                                    {product.name}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                                    {product.description}
                                  </p>
                                </div>

                                <div className="mt-4 flex items-end justify-between pt-2 border-t border-slate-50">
                                  <div>
                                    <span className="text-[9px] text-slate-400 block font-mono">Price</span>
                                    <span className="text-xs font-extrabold text-slate-900 font-display">
                                      ₹{product.price.toFixed(2)}
                                      <span className="text-slate-400 font-medium"> / {product.unit}</span>
                                    </span>
                                  </div>

                                  {/* Small Sparkline Historical Price Trend */}
                                  <div className="flex flex-col items-center justify-center min-w-[64px]" title="7-day historical price trend">
                                    <span className="text-[8px] text-slate-400 font-mono mb-0.5">7d Trend</span>
                                    <div className="h-5 w-16 opacity-95">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={generatePriceHistory(product.price, product.id)}>
                                          <Line
                                            type="monotone"
                                            dataKey="price"
                                            stroke="#10b981"
                                            strokeWidth={1.5}
                                            dot={false}
                                          />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => setSelectedProductForAI(product)}
                                      className={`p-1.5 rounded-lg border transition-all ${
                                        selectedProductForAI?.id === product.id
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-slate-50 text-slate-500 border-slate-100 hover:text-slate-800'
                                      }`}
                                      title="Ask Greenwood Assistant about this produce"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                    </button>

                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.93 }}
                                      disabled={product.stock === 0}
                                      onClick={() => addToCart(product)}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                        product.stock === 0
                                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      }`}
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>Add ({product.stock})</span>
                                    </motion.button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* COMPLETED ORDER HISTORY SECTION */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs mt-2 animate-fade-in" id="order-history-panel">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-display">Completed Order History</h3>
                      <p className="text-[10px] text-slate-400 font-sans">Delivered fresh-from-soil packages</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-100">
                    {sortedCompletedOrders.length} Completed
                  </span>
                </div>

                {historyNotification && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <span>{historyNotification}</span>
                  </motion.div>
                )}

                {sortedCompletedOrders.length === 0 ? (
                  <div className="bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-8 text-center select-none">
                    <Clipboard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-xs font-semibold text-slate-600">No previous orders found</h4>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      Once a driver completes simulated GPS delivery of your fresh items, your order receipt and tracking log will display here permanently!
                    </p>
                    <div className="mt-4 flex flex-col items-center justify-center gap-1.5 bg-white border border-slate-100 rounded-xl p-3 max-w-md mx-auto text-left">
                      <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">Quick Simulation Guide:</span>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        1. Add items to your basket and check out.<br />
                        2. Switch to the **Rider App** (or Shop Inventory to check dispatch).<br />
                        3. Use **Autopilot / Broadcast Checkpoints** to simulate courier delivery.<br />
                        4. Watch it automatically save into this history tab!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                    {sortedCompletedOrders.map((order) => {
                      const orderDate = new Date(order.createdAt);
                      const formattedDate = !isNaN(orderDate.getTime())
                        ? orderDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Completed recently';

                      return (
                        <div
                          key={order.id}
                          className="bg-slate-50 border border-slate-150/80 rounded-xl p-4 hover:border-emerald-200 transition-colors"
                        >
                          {/* Order Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/50">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-emerald-850">
                                  #GF-{order.id.slice(0, 8).toUpperCase()}
                                </span>
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full border border-emerald-200/50 flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" /> Delivered
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">
                                Ordered on {formattedDate}
                              </span>
                            </div>

                            <div className="text-right flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-2">
                              <span className="text-[9px] text-slate-400 font-sans block">Total Price Paid</span>
                              <span className="text-sm font-extrabold text-slate-900 font-display">
                                ₹{order.totalAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Items Purchased List */}
                          <div className="py-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Harvest Packages
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {order.items.map((item) => (
                                <div
                                  key={item.product.id}
                                  className="flex items-center gap-2.5 bg-white p-2 rounded-lg border border-slate-150"
                                >
                                  <img
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    referrerPolicy="no-referrer"
                                    className="w-9 h-9 rounded-md object-cover border border-slate-100 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <h5 className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                                      {item.product.name}
                                    </h5>
                                    <p className="text-[9px] text-slate-400 mt-0.5">
                                      {item.quantity} {item.product.unit} × ₹{item.product.price.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Actions Footer */}
                          <div className="pt-3 border-t border-slate-200/50 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[200px] sm:max-w-[320px]">
                                Sent to: {order.deliveryAddress} ({order.customerName})
                              </span>
                            </div>

                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => handleReorder(order.items)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                              >
                                <ShoppingCart className="w-3 h-3" />
                                <span>Buy Again</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: BASKET & CHATBOT INTERACTIVE CORES */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {!activeOrderId && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5" id="cart-panel">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900 font-display">Shopping Basket</h3>
                    </div>
                    <motion.span
                      key={totalItems}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 350, damping: 15 }}
                      className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-mono font-bold"
                    >
                      {totalItems} items
                    </motion.span>
                  </div>

                  {checkoutStep === 'shopping' ? (
                    <div className="mt-3 space-y-4">
                      {cart.length === 0 ? (
                        <div className="text-center py-10 select-none">
                          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <h4 className="text-xs font-semibold text-slate-500">Your basket is empty</h4>
                          <p className="text-[10px] text-slate-400 mt-1">Browse and add the daily freshest organic produce!</p>
                        </div>
                      ) : (
                        <>
                          <div className="max-h-[220px] overflow-y-auto space-y-3 pr-1">
                            {cart.map((item) => (
                              <div key={item.product.id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-150">
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                                
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-[11px] font-bold text-slate-900 font-display truncate">{item.product.name}</h4>
                                  <p className="text-[10px] text-emerald-700 font-bold font-mono mt-0.5">
                                    ₹{item.product.price.toFixed(2)}<span className="text-slate-400 font-medium font-sans">/{item.product.unit}</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-1">
                                  <div className="flex items-center bg-white border border-slate-200 rounded-lg px-1 py-0.5 shadow-2xs">
                                    <button onClick={() => updateQuantity(item.product.id, -1)} className="p-0.5 text-slate-500 hover:text-slate-800">
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="px-1.5 text-[10px] font-bold text-slate-800 font-mono">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.product.id, 1)} className="p-0.5 text-slate-500 hover:text-slate-800">
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  
                                  <button onClick={() => removeFromCart(item.product.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-2 pt-3 border-t border-slate-100">
                            <div className="flex justify-between text-xs font-semibold text-slate-600">
                              <span>Subtotal</span>
                              <span className="font-mono">₹{cartTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-slate-600">
                              <span>Delivery Fee</span>
                              <span className="text-emerald-700 font-bold uppercase text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Free</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-dashed border-slate-150 font-display">
                              <span>Total Basket</span>
                              <span className="text-emerald-700 font-mono font-extrabold text-base">₹{cartTotal.toFixed(2)}</span>
                            </div>

                            <button
                              onClick={() => setCheckoutStep('checkout')}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-colors mt-2 cursor-pointer"
                            >
                              <span>Proceed to Checkout</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handlePlaceOrder} className="mt-3 space-y-4">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                        <button
                          type="button"
                          onClick={() => setCheckoutStep('shopping')}
                          className="text-slate-500 hover:text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          ← Basket
                        </button>
                        <span className="font-bold text-emerald-700">Total: ₹{cartTotal.toFixed(2)}</span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans mb-1">Your Full Name</label>
                          <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              required
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              placeholder="Aditya Singh"
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:outline-hidden focus:border-emerald-300 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans mb-1">Contact Phone Number</label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="tel"
                              required
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              placeholder="(555) 019-2834"
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:outline-hidden focus:border-emerald-300 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans mb-1">Delivery Address</label>
                          <div className="relative">
                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              required
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              placeholder="420 Pine Lane, Greenwood"
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:outline-hidden focus:border-emerald-300 focus:bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-colors mt-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Place Fresh Order</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* DYNAMIC AI FARM ASSISTANT MODULE */}
              <AssistantPanel cartItems={activeOrder ? activeOrder.items : cart} selectedProduct={selectedProductForAI} />

            </div>

          </div>
        )}

        {/* 2. SHOP OWNER INVENTORY VIEW */}
        {currentRole === 'owner' && (
          <div className="animate-fade-in">
            <OwnerView products={products} orders={orders} onAdjustStock={handleAdjustStock} />
          </div>
        )}

        {/* 3. COURIER RIDER VIEW */}
        {currentRole === 'rider' && (
          <div className="animate-fade-in">
            <DeliveryView orders={orders} />
          </div>
        )}

        {/* 4. MASTER ADMINISTRATIVE CONTROL PANEL */}
        {currentRole === 'admin' && (
          <div className="animate-fade-in">
            <AdminView products={products} orders={orders} onResetDatabase={handleResetDatabase} />
          </div>
        )}

      </main>

      {/* FOOTER PERSISTED METADATA */}
      <footer className="bg-white border-t border-slate-100 py-6 px-6 text-center select-none mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 Greenwood Farmstead. Designed for real-time multi-role simulation.</p>
          <div className="flex gap-4">
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Firestore Database: Online
            </span>
            <span>Server Side Proxy: Active</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
