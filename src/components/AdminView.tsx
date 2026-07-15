import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  TrendingUp, 
  Users, 
  Activity, 
  Trash2, 
  X, 
  Check, 
  AlertOctagon, 
  Database, 
  RefreshCw, 
  FileText, 
  DollarSign, 
  Clipboard, 
  Server,
  Terminal,
  Clock,
  Heart,
  Plus,
  MapPin,
  Store,
  Compass,
  Search,
  Percent,
  Eye,
  Sliders,
  Send,
  Award,
  Gift,
  ShieldCheck,
  UserCheck,
  Edit,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Download,
  Filter
} from 'lucide-react';
import { Order, Product, OrderStatus } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc, writeBatch, collection, getDocs, addDoc } from 'firebase/firestore';
import DeliveryMap from './DeliveryMap';

interface AdminViewProps {
  orders: Order[];
  products: Product[];
  onResetDatabase: () => Promise<void>;
}

export default function AdminView({ orders, products, onResetDatabase }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'catalog' | 'logistics' | 'marketing' | 'platform'>('analytics');
  const [isResetting, setIsResetting] = useState(false);
  const [telemetryLog, setTelemetryLog] = useState<string[]>([
    "Administrative Command Console booted.",
    "Syncing Live Firestore database cluster...",
    "Platform tax structures verified.",
    "Geofencing nodes connected (Greenwood & Pine Crest service areas)."
  ]);

  const pushLog = (msg: string) => {
    setTelemetryLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
  };

  // ----------------------------------------------------
  // MOCK STATES THAT PERSIST IN STATE DURING SESSION
  // ----------------------------------------------------
  
  // 1. User & Access Management State
  const [userList, setUserList] = useState([
    { id: 'u1', name: 'Arun Kumar', email: 'arun@example.com', role: 'Customer', status: 'Active', docStatus: 'N/A' },
    { id: 'u2', name: 'Meera Sen', email: 'meera@example.com', role: 'Customer', status: 'Suspended', docStatus: 'N/A' },
    { id: 'u3', name: 'Vijay Patel', email: 'vijay@example.com', role: 'Customer', status: 'Active', docStatus: 'N/A' },
    { id: 'u4', name: 'Suresh Raina', email: 'suresh@delivery.com', role: 'Delivery Partner', status: 'Active', docStatus: 'Verified' },
    { id: 'u5', name: 'Rohan Das', email: 'rohan@delivery.com', role: 'Delivery Partner', status: 'Pending Onboarding', docStatus: 'Pending Verification' },
    { id: 'u6', name: 'Kunal Shah', email: 'kunal@store.com', role: 'Store Manager', status: 'Active', docStatus: 'Verified' },
    { id: 'u7', name: 'Richa Sharma', email: 'richa@store.com', role: 'Store Manager', status: 'Active', docStatus: 'Verified' },
  ]);

  const [newUserRole, setNewUserRole] = useState({ name: '', email: '', role: 'Ops Agent' });

  // 2. Store Onboarding State
  const [stores, setStores] = useState([
    { id: 'st1', name: "Nature's Basket Organic", owner: 'Karan Johar', category: 'Organic Vegetables', status: 'Pending', commission: 12 },
    { id: 'st2', name: 'SuperMart Express', owner: 'Amrita Rao', category: 'Gourmet & Groceries', status: 'Approved', commission: 10 },
    { id: 'st3', name: 'Kalyan Farm Fresh', owner: 'Amit Kalyan', category: 'Fresh Fruits', status: 'Pending', commission: 15 },
    { id: 'st4', name: 'Valley Greens Hydroponics', owner: 'Ritu Sen', category: 'Microgreens', status: 'Approved', commission: 12 },
  ]);

  // 3. Marketing State
  const [coupons, setCoupons] = useState([
    { code: 'WELCOME50', discount: 50, type: 'flat', minOrder: 299, active: true },
    { code: 'ORGANIC20', discount: 20, type: 'percent', minOrder: 199, active: true },
    { code: 'FRESHGREEN', discount: 40, type: 'flat', minOrder: 399, active: false }
  ]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(50);
  const [newCouponType, setNewCouponType] = useState<'flat' | 'percent'>('flat');
  const [newCouponMin, setNewCouponMin] = useState(299);

  const [marketingCampaign, setMarketingCampaign] = useState({ title: '', body: '', target: 'all' });

  // 4. Platform Configuration Rules State
  const [commissionPct, setCommissionPct] = useState(12);
  const [marginPct, setMarginPct] = useState(5);
  const [applyOrganicDiscount, setApplyOrganicDiscount] = useState(true);
  const [deliveryFeeFlat, setDeliveryFeeFlat] = useState(40);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.0);
  const [taxPct, setTaxPct] = useState(5);
  const [postalCodes, setPostalCodes] = useState(['560001', '560038', '560102', '560066']);
  const [newPostalCode, setNewPostalCode] = useState('');

  // 5. Content Moderation Queue
  const [reviewsQueue, setReviewsQueue] = useState([
    { id: 'rev1', product: 'Kashmiri Apples', rating: 1, user: 'Rahul M.', text: 'Apples were rotten, highly disappointed!', flaggedReason: 'Profanity flagged by filter', status: 'Flagged' },
    { id: 'rev2', product: 'Organic Toor Dal', rating: 5, user: 'Sanya K.', text: 'Best quality dal ever, perfectly polished and super tasty.', flaggedReason: 'Contains promotional link', status: 'Flagged' },
  ]);

  // 6. Logistics & Dispute state
  const [disputes, setDisputes] = useState([
    { id: 'disp1', orderId: 'disp1', customer: 'Arun Kumar', issue: 'Damaged item: Kashmiri Apples', refundAmt: 125, status: 'Open' },
    { id: 'disp2', orderId: 'disp2', customer: 'Vijay Patel', issue: 'Missing item: Whole Wheat Atta', refundAmt: 350, status: 'Resolved' }
  ]);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const activeOrder = orders.find(o => o.id === selectedOrderId) || orders[0] || null;

  // Catalog Add Product Form
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Groceries');
  const [newProdPrice, setNewProdPrice] = useState(100);
  const [newProdUnit, setNewProdUnit] = useState('1 kg');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImg, setNewProdImg] = useState('https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80');
  const [newProdStock, setNewProdStock] = useState(25);
  const [newProdCalories, setNewProdCalories] = useState(120);
  const [newProdProtein, setNewProdProtein] = useState(3.5);
  const [newProdHealth, setNewProdHealth] = useState('Rich in dietary fibers and plant nutrition.');
  const [newProdOrganic, setNewProdOrganic] = useState(true);

  // Editing values for products catalog
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState<number>(0);
  const [editingPrice, setEditingPrice] = useState<number>(0);

  // ----------------------------------------------------
  // EVENT HANDLERS
  // ----------------------------------------------------

  // Real Database orders status override
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      pushLog(`Order #${orderId.slice(0, 6).toUpperCase()} status updated to [${status}].`);
    } catch (err) {
      console.error(err);
      pushLog(`ERROR updating order #${orderId.slice(0, 6)}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Reassign Delivery Partner Mockup
  const handleReassignRider = (orderId: string, riderName: string) => {
    pushLog(`Reassigned order #${orderId.slice(0, 6).toUpperCase()} to Courier Partner: ${riderName}`);
  };

  // Delete Order Record
  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm("Delete this order record permanently from Firestore?")) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        pushLog(`Order #${orderId.slice(0, 6).toUpperCase()} permanently purged.`);
      } catch (err) {
        console.error(err);
        pushLog(`ERROR deleting order #${orderId.slice(0, 6)}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  // Onboard Store Action
  const handleStoreStatus = (id: string, newStatus: string) => {
    setStores(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    const target = stores.find(s => s.id === id);
    pushLog(`Store "${target?.name}" onboarding status set to: ${newStatus}`);
  };

  // User list suspensions and verifications
  const toggleUserSuspension = (id: string) => {
    setUserList(prev => prev.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'Active' ? 'Suspended' : 'Active';
        pushLog(`User "${u.name}" account status updated to: ${nextStatus}`);
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const approveUserDocuments = (id: string) => {
    setUserList(prev => prev.map(u => {
      if (u.id === id) {
        pushLog(`Approved documentation verification for "${u.name}"`);
        return { ...u, docStatus: 'Verified', status: 'Active' };
      }
      return u;
    }));
  };

  // Add internal Role-based ops account
  const handleAddRoleAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserRole.name || !newUserRole.email) return;
    const newAccount = {
      id: 'u_ops_' + Date.now(),
      name: newUserRole.name,
      email: newUserRole.email,
      role: newUserRole.role,
      status: 'Active',
      docStatus: 'Verified'
    };
    setUserList(prev => [...prev, newAccount]);
    pushLog(`Authorized Role-Based Access: Created ${newAccount.role} for "${newAccount.name}"`);
    setNewUserRole({ name: '', email: '', role: 'Ops Agent' });
  };

  // Catalog update helper (real database write)
  const saveProductEdits = async (productId: string) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        stock: Number(editingStock),
        price: Number(editingPrice)
      });
      pushLog(`Saved master catalog update for product ${productId.slice(0, 6)}: Stock ${editingStock}, Price ₹${editingPrice}`);
      setEditingProdId(null);
    } catch (err: any) {
      pushLog(`Error updating product catalog in database: ${err.message}`);
    }
  };

  // Catalog delete product
  const deleteProductFromCatalog = async (productId: string) => {
    if (window.confirm("Permanently delete this product from the master catalog database?")) {
      try {
        await deleteDoc(doc(db, 'products', productId));
        pushLog(`Product ${productId.slice(0, 6)} deleted from catalog.`);
      } catch (err: any) {
        pushLog(`Error deleting product from database: ${err.message}`);
      }
    }
  };

  // Create new product in Firestore
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'products'), {
        name: newProdName,
        category: newProdCategory,
        price: Number(newProdPrice),
        unit: newProdUnit,
        description: newProdDesc,
        imageUrl: newProdImg,
        stock: Number(newProdStock),
        freshness: "Harvested recently",
        organic: newProdOrganic,
        rating: 5.0,
        calories: Number(newProdCalories),
        protein: Number(newProdProtein),
        healthDetails: newProdHealth
      });
      pushLog(`Successfully created product "${newProdName}" in master catalog (DB ID: ${docRef.id.slice(0, 6)})`);
      
      // Reset form
      setNewProdName('');
      setNewProdDesc('');
    } catch (err: any) {
      pushLog(`Error creating product: ${err.message}`);
    }
  };

  // Marketing Coupons
  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    const codeUpper = newCouponCode.trim().toUpperCase();
    if (coupons.some(c => c.code === codeUpper)) {
      alert("Promo code already exists!");
      return;
    }
    const promo = {
      code: codeUpper,
      discount: Number(newCouponDiscount),
      type: newCouponType,
      minOrder: Number(newCouponMin),
      active: true
    };
    setCoupons(prev => [promo, ...prev]);
    pushLog(`Campaign created: Voucher "${promo.code}" with ₹${promo.discount} ${promo.type === 'percent' ? '%' : 'off'} launched.`);
    setNewCouponCode('');
  };

  const toggleCouponStatus = (code: string) => {
    setCoupons(prev => prev.map(c => c.code === code ? { ...c, active: !c.active } : c));
    const codeState = coupons.find(c => c.code === code);
    pushLog(`Promo campaign "${code}" status updated to: ${!codeState?.active ? 'Enabled' : 'Disabled'}`);
  };

  // Marketing notification dispatch simulation
  const handlePushNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketingCampaign.title || !marketingCampaign.body) return;
    pushLog(`CAMPAIGN SENT: Broadcasted push notification to audience group [${marketingCampaign.target}]`);
    pushLog(`> Header: "${marketingCampaign.title}" | Content: "${marketingCampaign.body}"`);
    alert(`Success: Campaign notification dispatched to all registered customer devices in group "${marketingCampaign.target}"`);
    setMarketingCampaign({ title: '', body: '', target: 'all' });
  };

  // Dispute resolution actions
  const handleResolveDispute = (id: string, action: string) => {
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: 'Resolved' } : d));
    pushLog(`Dispute "${id}" resolved with action: ${action}`);
  };

  // Content moderation reviews approval / deletion
  const handleModerateReview = (id: string, action: 'Approve' | 'Delete') => {
    setReviewsQueue(prev => prev.filter(r => r.id !== id));
    pushLog(`Content Moderation: ${action} action applied on review ID ${id}`);
  };

  // Platform Area geofence
  const handleAddPostalCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostalCode.trim()) return;
    if (postalCodes.includes(newPostalCode.trim())) return;
    setPostalCodes(prev => [...prev, newPostalCode.trim()]);
    pushLog(`Service Area Extension: Added ZIP code ${newPostalCode.trim()} to active delivery zones.`);
    setNewPostalCode('');
  };

  const handleRemovePostalCode = (code: string) => {
    setPostalCodes(prev => prev.filter(c => c !== code));
    pushLog(`Service Area Limitation: Disabled ZIP code ${code} from operational grids.`);
  };

  // CSV Report Generator download simulation
  const handleExportCSV = (reportType: string) => {
    let headers = "";
    let rows = [];
    if (reportType === 'revenue') {
      headers = "Order ID,Customer Name,Amount,Status,Estimated Time,Rider Active\n";
      rows = orders.map(o => `${o.id},"${o.customerName}",${o.totalAmount},${o.status},${o.estimatedDelivery},${o.driverCoords ? 'Yes' : 'No'}`);
    } else if (reportType === 'catalog') {
      headers = "Product ID,Product Name,Category,Price,Stock,Calories,Protein,Organic\n";
      rows = products.map(p => `${p.id},"${p.name}","${p.category}",${p.price},${p.stock},${p.calories || 0},${p.protein || 0},${p.organic}`);
    } else {
      headers = "User ID,Name,Email,Role,Status,Verification Status\n";
      rows = userList.map(u => `${u.id},"${u.name}",${u.email},${u.role},${u.status},${u.docStatus}`);
    }
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    pushLog(`Exported direct ${reportType.toUpperCase()} database ledger report in CSV format.`);
  };

  // Database purges / reset
  const triggerFactoryReset = async () => {
    if (window.confirm("⚠️ WARNING: This will restore the product list catalog back to defaults and clear all orders. Continue?")) {
      setIsResetting(true);
      pushLog("Purging orders and refreshing catalog in Firestore...");
      try {
        await onResetDatabase();
        pushLog("Factory database reset successful!");
      } catch (err) {
        console.error(err);
        pushLog(`Factory reset failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsResetting(false);
      }
    }
  };

  // Calculated Stats
  const totalGMV = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrderValue = orders.length > 0 ? (totalGMV / orders.length) : 0;
  const deliveryOpsCount = userList.filter(u => u.role === 'Delivery Partner').length;
  const storeManagersCount = userList.filter(u => u.role === 'Store Manager').length;
  const activeStoresCount = stores.filter(s => s.status === 'Approved').length;

  return (
    <div className="space-y-6" id="master-admin-panel">
      
      {/* BRAND & STATS PANEL HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">ALPHAMART Enterprise Operations Console</h2>
            <p className="text-xs text-slate-500 mt-1">
              Super-admin control over customers, stores catalog, logistics routing, growth marketing, and platform parameters.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[10px] bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 font-bold font-mono flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span>DB CLUSTER: ASIA-EAST1 (LIVE)</span>
          </div>
          <button
            onClick={triggerFactoryReset}
            disabled={isResetting}
            className="text-[10px] bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo DB</span>
          </button>
        </div>
      </div>

      {/* ADMIN TABS COMPONENT */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl max-w-full overflow-x-auto scrollbar-none">
        {[
          { id: 'analytics', label: 'Analytics & Reporting', icon: TrendingUp },
          { id: 'users', label: 'User & Staff Manager', icon: Users },
          { id: 'catalog', label: 'Stores & Catalog', icon: Store },
          { id: 'logistics', label: 'Order Dispatch & Map', icon: Compass },
          { id: 'marketing', label: 'Marketing & Loyalty', icon: Gift },
          { id: 'platform', label: 'Platform Settings', icon: Sliders },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'bg-white text-emerald-800 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* CORE INTERACTIVE CONSOLES */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* TAB CONTENTS (8 Columns on desktop, takes 12 column width) */}
        <div className="xl:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs"
            >
              
              {/* ==================================================== */}
              {/* 1. ANALYTICS & REPORTING TAB */}
              {/* ==================================================== */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-display">System GMV & Performance Scorecard</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Real-time aggregate turnover, customer retention, and partner metrics.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportCSV('revenue')}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-200/50 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Revenue</span>
                      </button>
                      <button
                        onClick={() => handleExportCSV('catalog')}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Catalog</span>
                      </button>
                    </div>
                  </div>

                  {/* HIGH-LEVEL METRICS CARDS */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Gross Merchandise Value</span>
                      <div className="text-xl font-black text-slate-900 mt-1 font-mono">₹{totalGMV.toFixed(2)}</div>
                      <p className="text-[9px] text-emerald-700 font-semibold mt-1">↑ 14.2% from last week</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Orders Volume</span>
                      <div className="text-xl font-black text-slate-900 mt-1 font-mono">{orders.length} orders</div>
                      <p className="text-[9px] text-slate-500 mt-1">Basket Size Average: ₹{avgOrderValue.toFixed(0)}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-2 md:col-span-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Platform Commission Fee (Est)</span>
                      <div className="text-xl font-black text-emerald-700 mt-1 font-mono">₹{(totalGMV * (commissionPct / 100)).toFixed(2)}</div>
                      <p className="text-[9px] text-slate-500 mt-1">Current Base Commission: {commissionPct}%</p>
                    </div>
                  </div>

                  {/* COHORT RETENTION GRID */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      <span>Customer Retention Cohort Grid (Trailing 4 Months)</span>
                    </h4>
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px]">
                            <th className="py-2.5 px-4">Cohort Month</th>
                            <th className="py-2.5 px-3 text-center">New Users</th>
                            <th className="py-2.5 px-3 text-center">Month 0</th>
                            <th className="py-2.5 px-3 text-center">Month 1</th>
                            <th className="py-2.5 px-3 text-center">Month 2</th>
                            <th className="py-2.5 px-3 text-center">Month 3</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {[
                            { month: 'March 2026', size: '1,240', m0: '100%', m1: '48.2%', m2: '41.5%', m3: '38.9%' },
                            { month: 'April 2026', size: '1,590', m0: '100%', m1: '52.1%', m2: '44.8%', m3: '40.2%' },
                            { month: 'May 2026', size: '1,840', m0: '100%', m1: '56.4%', m2: '48.1%', m3: '-' },
                            { month: 'June 2026', size: '2,110', m0: '100%', m1: '59.8%', m2: '-', m3: '-' },
                          ].map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-4 font-bold text-slate-700">{row.month}</td>
                              <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{row.size}</td>
                              <td className="py-2.5 px-3 text-center bg-emerald-50 text-emerald-800 font-mono font-bold text-[10px]">{row.m0}</td>
                              <td className="py-2.5 px-3 text-center bg-emerald-50/70 text-emerald-800 font-mono text-[10px]">{row.m1}</td>
                              <td className="py-2.5 px-3 text-center bg-emerald-50/40 text-emerald-800 font-mono text-[10px]">{row.m2}</td>
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[10px]">{row.m3}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SYSTEM PERFORMANCE BREAKDOWN */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Delivery Partner Scorecard */}
                    <div className="border border-slate-100 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-amber-500" />
                        <span>Courier Partner Performance</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                          <span className="text-slate-500">Active Partners</span>
                          <span className="font-bold text-slate-800 font-mono">{deliveryOpsCount} onboarded</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                          <span className="text-slate-500">Average Delivery Time</span>
                          <span className="font-bold text-emerald-700 font-mono">16.4 mins</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Dispute Rate (late/damaged)</span>
                          <span className="font-bold text-amber-600 font-mono">1.2%</span>
                        </div>
                      </div>
                    </div>

                    {/* Store Performance Scorecard */}
                    <div className="border border-slate-100 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-indigo-500" />
                        <span>Onboarded Store Stats</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                          <span className="text-slate-500">Active Stores Listed</span>
                          <span className="font-bold text-slate-800 font-mono">{activeStoresCount} approved</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                          <span className="text-slate-500">Store Commission Captured</span>
                          <span className="font-bold text-emerald-700 font-mono">₹{(totalGMV * (commissionPct / 100)).toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Pending Store Signups</span>
                          <span className="font-bold text-amber-600 font-mono">{stores.filter(s => s.status === 'Pending').length} requests</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ==================================================== */}
              {/* 2. USER & ACCESS MANAGEMENT TAB */}
              {/* ==================================================== */}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-display">User & Staff Directory</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Approve onboarding delivery documents, manage suspensions, and assign ops roles.</p>
                    </div>
                  </div>

                  {/* ADD INTERNAL ROLE ACCESS FORM */}
                  <form onSubmit={handleAddRoleAccount} className="bg-slate-50 p-4 rounded-xl border border-slate-150 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={newUserRole.name}
                        onChange={(e) => setNewUserRole(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="johndoe@staff.com"
                        value={newUserRole.email}
                        onChange={(e) => setNewUserRole(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Authorized Role</label>
                      <select
                        value={newUserRole.role}
                        onChange={(e) => setNewUserRole(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-medium cursor-pointer"
                      >
                        <option value="Ops Agent">Ops Agent</option>
                        <option value="Catalog Editor">Catalog Editor</option>
                        <option value="Dispute Moderator">Dispute Moderator</option>
                        <option value="Manager Admin">Manager Admin</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Grant Role</span>
                    </button>
                  </form>

                  {/* USER DATA DIRECTORY TABLE */}
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px]">
                          <th className="py-3 px-4">Name & Contact</th>
                          <th className="py-3 px-3">Role Type</th>
                          <th className="py-3 px-3 text-center">Document Status</th>
                          <th className="py-3 px-3 text-center">Sys Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {userList.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800">{user.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{user.email}</div>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-sans ${
                                user.role === 'Delivery Partner' 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                  : user.role === 'Store Manager'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                  : user.role.includes('Ops') || user.role.includes('Admin')
                                  ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-[10px]">
                              {user.docStatus === 'Pending Verification' ? (
                                <button 
                                  onClick={() => approveUserDocuments(user.id)}
                                  className="mx-auto px-2 py-0.5 bg-amber-50 text-amber-700 hover:bg-emerald-50 hover:text-emerald-800 border border-amber-200 hover:border-emerald-200 rounded text-[9px] font-bold block transition-colors cursor-pointer"
                                  title="Click to verify driving license and background test document"
                                >
                                  📝 Verify Docs
                                </button>
                              ) : user.docStatus === 'Verified' ? (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-bold inline-block">
                                  ✓ Verified
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`text-[10px] font-bold ${user.status === 'Active' ? 'text-emerald-600' : 'text-red-500'}`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => toggleUserSuspension(user.id)}
                                className={`text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer ${
                                  user.status === 'Active' 
                                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200' 
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {user.status === 'Active' ? 'Suspend' : 'Unsuspend'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* 3. STORE & CATALOG OVERSIGHT TAB */}
              {/* ==================================================== */}
              {activeTab === 'catalog' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-display">Store Onboarding & Catalog Controls</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Approve grocery stores, customize global markup margin rules, and edit catalog items.</p>
                    </div>
                  </div>

                  {/* NEW STORES ONBOARDING APPROVAL QUEUE */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Pending Partner Stores Sign-Ups ({stores.filter(s => s.status === 'Pending').length})</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {stores.map(store => (
                        <div key={store.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                          <div>
                            <span className="text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded-full font-mono font-bold uppercase">
                              {store.category}
                            </span>
                            <h5 className="font-bold text-slate-800 text-xs mt-1.5">{store.name}</h5>
                            <p className="text-[10px] text-slate-400 mt-0.5">Owner: {store.owner} | Commission Set: {store.commission}%</p>
                          </div>
                          
                          <div className="flex flex-col gap-1 shrink-0">
                            {store.status === 'Pending' ? (
                              <>
                                <button
                                  onClick={() => handleStoreStatus(store.id, 'Approved')}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold transition-all cursor-pointer"
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  onClick={() => handleStoreStatus(store.id, 'Rejected')}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[9px] font-bold transition-all cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className={`text-[10px] font-bold text-center px-2 py-0.5 rounded-full uppercase ${store.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {store.status}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* MASTER PRICING RULES CONTROL */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-slate-100 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Percent className="w-4 h-4 text-emerald-600" />
                        <span>Platform Pricing Rules</span>
                      </h4>
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="flex justify-between text-[11px] text-slate-500 font-semibold mb-1">
                            <span>Base Store Commission Percentage</span>
                            <span className="font-bold text-slate-800 font-mono">{commissionPct}% per sale</span>
                          </label>
                          <input
                            type="range"
                            min="5"
                            max="25"
                            value={commissionPct}
                            onChange={(e) => {
                              setCommissionPct(Number(e.target.value));
                              pushLog(`Platform Commission rate updated globally to ${e.target.value}%`);
                            }}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="flex justify-between text-[11px] text-slate-500 font-semibold mb-1">
                            <span>Global Operational Price Margin (Markup)</span>
                            <span className="font-bold text-slate-800 font-mono">+{marginPct}% markup</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="15"
                            value={marginPct}
                            onChange={(e) => {
                              setMarginPct(Number(e.target.value));
                              pushLog(`Global Margin Markup rule updated to ${e.target.value}%`);
                            }}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-100 p-4 rounded-xl flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                          <Sliders className="w-4 h-4 text-emerald-600" />
                          <span>Dynamic Subsidy Taxonomy</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Applying systemic discount subsidies encourages a healthier dietary pattern and builds customer cohorts loyalty.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 cursor-pointer text-xs font-semibold text-emerald-800 select-none">
                        <input
                          type="checkbox"
                          checked={applyOrganicDiscount}
                          onChange={(e) => {
                            setApplyOrganicDiscount(e.target.checked);
                            pushLog(`Organic Food Subsidy set to: ${e.target.checked ? 'Enabled (5% Auto-discount)' : 'Disabled'}`);
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                        />
                        <span>Auto-apply 5% Green Subsidy on certified Organic products</span>
                      </label>
                    </div>
                  </div>

                  {/* MASTER PRODUCT LIST & STOCK CONTROLLER */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                      Master Inventory List ({products.length} Items Listed)
                    </h4>
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px]">
                            <th className="py-2.5 px-3">Product Name</th>
                            <th className="py-2.5 px-2">Category</th>
                            <th className="py-2.5 px-2 text-right">Price</th>
                            <th className="py-2.5 px-2 text-center">Stock Level</th>
                            <th className="py-2.5 px-3 text-right">Operations</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          {products.map((p) => {
                            const isEditing = editingProdId === p.id;
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={p.imageUrl}
                                      alt={p.name}
                                      referrerPolicy="no-referrer"
                                      className="w-6 h-6 rounded-md object-cover border border-slate-100"
                                    />
                                    <div className="truncate max-w-[150px]">
                                      <span className="font-bold text-slate-800">{p.name}</span>
                                      <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{p.unit} | {p.organic ? 'Organic 🌿' : 'Standard'}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-slate-500 text-[10px]">{p.category}</td>
                                <td className="py-2 px-2 text-right font-bold">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={editingPrice}
                                      onChange={(e) => setEditingPrice(Number(e.target.value))}
                                      className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-right text-xs font-bold"
                                    />
                                  ) : (
                                    <span className="font-mono">₹{p.price}</span>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={editingStock}
                                      onChange={(e) => setEditingStock(Number(e.target.value))}
                                      className="w-14 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center text-xs font-bold"
                                    />
                                  ) : (
                                    <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${p.stock <= 5 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                                      {p.stock} units
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    {isEditing ? (
                                      <>
                                        <button
                                          onClick={() => saveProductEdits(p.id)}
                                          className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded shadow-2xs hover:bg-emerald-700 cursor-pointer"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingProdId(null)}
                                          className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded hover:bg-slate-200 cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => {
                                            setEditingProdId(p.id);
                                            setEditingStock(p.stock);
                                            setEditingPrice(p.price);
                                          }}
                                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => deleteProductFromCatalog(p.id)}
                                          className="text-slate-300 hover:text-red-600 cursor-pointer"
                                          title="Delete Product"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* CREATE PRODUCT FORM */}
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-150 space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-600" />
                      <span>Create New Product Entry (Direct Firestore Insertion)</span>
                    </h4>

                    <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs text-slate-700 font-semibold">
                      <div className="md:col-span-4">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Product Name</label>
                        <input
                          type="text"
                          required
                          value={newProdName}
                          onChange={(e) => setNewProdName(e.target.value)}
                          placeholder="e.g. Premium Alphonso Mangoes"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Taxonomy Category</label>
                        <select
                          value={newProdCategory}
                          onChange={(e) => setNewProdCategory(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-medium cursor-pointer"
                        >
                          <option value="Groceries">Groceries</option>
                          <option value="Vegetables">Vegetables</option>
                          <option value="Premium Fruits">Premium Fruits</option>
                          <option value="Home & Kitchen">Home & Kitchen</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Price (₹)</label>
                        <input
                          type="number"
                          required
                          value={newProdPrice}
                          onChange={(e) => setNewProdPrice(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Sale Unit / Metric</label>
                        <input
                          type="text"
                          required
                          value={newProdUnit}
                          onChange={(e) => setNewProdUnit(e.target.value)}
                          placeholder="e.g. 500g, 1 kg, 6 pcs"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium"
                        />
                      </div>

                      <div className="md:col-span-12">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Product Narrative Description</label>
                        <input
                          type="text"
                          value={newProdDesc}
                          onChange={(e) => setNewProdDesc(e.target.value)}
                          placeholder="Rich, sweet taste, organically grown in organic certified local estates..."
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium"
                        />
                      </div>

                      {/* Nutrition parameters */}
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Calories (kcal)</label>
                        <input
                          type="number"
                          value={newProdCalories}
                          onChange={(e) => setNewProdCalories(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Protein (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={newProdProtein}
                          onChange={(e) => setNewProdProtein(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                        />
                      </div>

                      <div className="md:col-span-5">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Health Details Description</label>
                        <input
                          type="text"
                          value={newProdHealth}
                          onChange={(e) => setNewProdHealth(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium"
                        />
                      </div>

                      <div className="md:col-span-3 flex items-center h-full pt-4">
                        <label className="flex items-center gap-2 select-none cursor-pointer text-xs font-bold text-slate-800">
                          <input
                            type="checkbox"
                            checked={newProdOrganic}
                            onChange={(e) => setNewProdOrganic(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4.5 w-4.5"
                          />
                          <span>Certified Organic 🌿</span>
                        </label>
                      </div>

                      <div className="md:col-span-12 flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <Database className="w-4 h-4" />
                          <span>Insert Product Into DB</span>
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              )}

              {/* ==================================================== */}
              {/* 4. ORDER & LOGISTICS OVERSIGHT TAB */}
              {/* ==================================================== */}
              {activeTab === 'logistics' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-display">Live Order Dispatch & Fleet Logistics</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Track courier maps in real-time, manually reassign riders, and process customer SLA disputes.</p>
                    </div>
                  </div>

                  {/* ACTIVE ORDERS SELECTOR & MAP */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Fleet Orders ({orders.length})</h4>
                      
                      {orders.length === 0 ? (
                        <div className="p-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                          <Clipboard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-slate-500">No active dispatch orders</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                          {orders.map((o) => {
                            const isSelected = selectedOrderId === o.id || (!selectedOrderId && orders[0]?.id === o.id);
                            // Simple mock SLA alert: If ordered/preparing and more than a few minutes, label danger
                            const isLate = o.status !== 'delivered' && Math.random() > 0.6; 
                            return (
                              <div
                                key={o.id}
                                onClick={() => setSelectedOrderId(o.id)}
                                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs' 
                                    : 'bg-white border-slate-200 hover:bg-slate-50/50'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-black text-xs text-slate-800">#{o.id.slice(0, 6).toUpperCase()}</span>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                                        o.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                                        o.status === 'transit' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                      }`}>
                                        {o.status}
                                      </span>
                                      {isLate && (
                                        <span className="text-[8px] bg-red-100 text-red-700 px-1 rounded font-bold animate-pulse">
                                          🚨 SLA Risk
                                        </span>
                                      )}
                                    </div>
                                    <h5 className="text-[11px] font-bold text-slate-800 mt-1">{o.customerName}</h5>
                                    <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{o.deliveryAddress}</p>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono font-black text-xs text-slate-800 block">₹{o.totalAmount}</span>
                                    <span className="text-[9px] text-slate-400 mt-0.5 block">Est: {o.estimatedDelivery}</span>
                                  </div>
                                </div>

                                {/* MANUAL RIDER REASSIGNMENT DROPDOWN */}
                                <div className="mt-2.5 pt-2 border-t border-dashed border-slate-100 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Manual Dispatch</span>
                                  <select
                                    onChange={(e) => handleReassignRider(o.id, e.target.value)}
                                    defaultValue=""
                                    className="bg-slate-100 border border-slate-200 text-slate-700 rounded px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer"
                                  >
                                    <option value="" disabled>Select Driver</option>
                                    <option value="Suresh Raina">Suresh Raina (Active)</option>
                                    <option value="Rohan Das">Rohan Das (Active)</option>
                                    <option value="Deepak Gill">Deepak Gill (Standby)</option>
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* LIVE TRACKING MAP WIDGET */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>Courier Tracker Map</span>
                        {activeOrder && (
                          <span className="text-[10px] font-mono text-slate-400">Tracking: #{activeOrder.id.slice(0, 6).toUpperCase()}</span>
                        )}
                      </h4>
                      <DeliveryMap
                        driverCoords={activeOrder?.driverCoords || null}
                        status={activeOrder?.status || 'ordered'}
                      />
                    </div>
                  </div>

                  {/* CUSTOMER REFUNDS & DISPUTE RESOLUTION CENTER */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4 text-red-500 animate-pulse" />
                      <span>Customer Order Disputes & Refund Claims ({disputes.filter(d => d.status === 'Open').length} Open)</span>
                    </h4>

                    <div className="space-y-2">
                      {disputes.map(dispute => (
                        <div key={dispute.id} className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-700">Ref: #{dispute.id}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${dispute.status === 'Open' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-slate-100 text-slate-600'}`}>
                                {dispute.status}
                              </span>
                            </div>
                            <p className="font-bold text-slate-800 mt-1">{dispute.issue}</p>
                            <span className="text-[10px] text-slate-400">Client: {dispute.customer} | Est Claim Refund: ₹{dispute.refundAmt}</span>
                          </div>

                          {dispute.status === 'Open' && (
                            <div className="flex gap-1.5 self-end md:self-center">
                              <button
                                onClick={() => handleResolveDispute(dispute.id, 'Approve 100% Refund')}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] transition-all cursor-pointer"
                              >
                                Approve 100% Refund
                              </button>
                              <button
                                onClick={() => handleResolveDispute(dispute.id, 'Approve 50% Refund')}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded font-bold text-[10px] border border-amber-200 transition-all cursor-pointer"
                              >
                                Refund 50%
                              </button>
                              <button
                                onClick={() => handleResolveDispute(dispute.id, 'Reject Claim')}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-semibold text-[10px] transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ==================================================== */}
              {/* 5. MARKETING & GROWTH TAB */}
              {/* ==================================================== */}
              {activeTab === 'marketing' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-display">Growth Marketing & Coupons Engine</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Issue discount coupons, trigger target push campaigns, and edit loyalty system scores.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Create Coupon Voucher */}
                    <div className="border border-slate-150 p-4 rounded-xl space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Percent className="w-4 h-4 text-emerald-600" />
                        <span>Launch Promo Code Campaign</span>
                      </h4>

                      <form onSubmit={handleAddCoupon} className="space-y-3 text-xs text-slate-700 font-semibold">
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Coupon Code</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. FLASH30"
                            value={newCouponCode}
                            onChange={(e) => setNewCouponCode(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Discount Magnitude</label>
                            <input
                              type="number"
                              required
                              value={newCouponDiscount}
                              onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Type</label>
                            <select
                              value={newCouponType}
                              onChange={(e) => setNewCouponType(e.target.value as any)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-medium cursor-pointer"
                            >
                              <option value="flat">Flat Cash (₹)</option>
                              <option value="percent">Percentage (%)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Min Order Threshold (₹)</label>
                          <input
                            type="number"
                            required
                            value={newCouponMin}
                            onChange={(e) => setNewCouponMin(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Deploy Voucher Code</span>
                        </button>
                      </form>
                    </div>

                    {/* Active vouchers list */}
                    <div className="border border-slate-150 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Campaigns & Promo Codes</h4>
                      <div className="space-y-2">
                        {coupons.map((c) => (
                          <div key={c.code} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px]">
                                {c.code}
                              </span>
                              <p className="font-bold text-slate-800 mt-2">
                                {c.type === 'flat' ? `₹${c.discount} off` : `${c.discount}% off`}
                              </p>
                              <span className="text-[9px] text-slate-400 block mt-0.5">Min basket: ₹{c.minOrder}</span>
                            </div>

                            <button
                              onClick={() => toggleCouponStatus(c.code)}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                c.active 
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-amber-100 hover:text-amber-800' 
                                  : 'bg-slate-200 text-slate-500 hover:bg-emerald-100 hover:text-emerald-800'
                              }`}
                            >
                              {c.active ? 'Active' : 'Disabled'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* PUSH NOTIFICATIONS BROADCAST SIMULATOR */}
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-150 space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <span>Dispatch Broadcast Push Notifications</span>
                    </h4>

                    <form onSubmit={handlePushNotification} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700 font-semibold">
                      <div className="md:col-span-1">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Target Cohort Group</label>
                        <select
                          value={marketingCampaign.target}
                          onChange={(e) => setMarketingCampaign(prev => ({ ...prev, target: e.target.value }))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-medium cursor-pointer"
                        >
                          <option value="all">All Registered Customers</option>
                          <option value="dormant">Dormant Users (Inactive &gt; 15 days)</option>
                          <option value="organic_lovers">High Organic Consumers</option>
                          <option value="new_onboarded">New Onboardings</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Campaign Alert Header</label>
                        <input
                          type="text"
                          required
                          value={marketingCampaign.title}
                          onChange={(e) => setMarketingCampaign(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g. 🥭 Farm Fresh Alphonsos are here!"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Notification Content Body</label>
                        <input
                          type="text"
                          required
                          value={marketingCampaign.body}
                          onChange={(e) => setMarketingCampaign(prev => ({ ...prev, body: e.target.value }))}
                          placeholder="Order within 1 hour to get 20% flat cash rebate on green veggies!"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium"
                        />
                      </div>

                      <div className="md:col-span-3 flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          <span>Broadcast Push Alert</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* LOYALTY & REWARDS CONFIGURATION */}
                  <div className="border border-slate-100 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500 animate-spin-slow" />
                        <span>Loyalty Program Threshold rules</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Customers earn rewards points automatically on checkouts. Currently: **1 Reward Point awarded per ₹10 spent.**
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-center font-mono">
                        <span className="text-[8px] text-slate-400 font-bold uppercase block">Minimum Redeem</span>
                        <span className="text-xs font-black text-slate-700">100 Points</span>
                      </div>
                      <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-center font-mono">
                        <span className="text-[8px] text-slate-400 font-bold uppercase block">Value per point</span>
                        <span className="text-xs font-black text-slate-700">₹0.50 Cash</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ==================================================== */}
              {/* 6. PLATFORM CONFIGURATION TAB */}
              {/* ==================================================== */}
              {activeTab === 'platform' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-display">System Configuration & Parameters</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Control base logistics pricing structures, tax brackets, service zip zones, and content moderation.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Logistical fees and rates */}
                    <div className="border border-slate-150 p-4 rounded-xl space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Logistics & Base Fees config</h4>
                      
                      <div className="space-y-3 text-xs text-slate-700 font-bold">
                        <div>
                          <label className="block text-[11px] text-slate-500 font-semibold mb-1">Flat Delivery Fee (₹)</label>
                          <input
                            type="number"
                            value={deliveryFeeFlat}
                            onChange={(e) => {
                              setDeliveryFeeFlat(Number(e.target.value));
                              pushLog(`Logistics Rules: Delivery fee set to flat ₹${e.target.value}`);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-black"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-500 font-semibold mb-1">Surge Pricing Multiplier (Rain/Demand)</label>
                          <select
                            value={surgeMultiplier}
                            onChange={(e) => {
                              setSurgeMultiplier(Number(e.target.value));
                              pushLog(`Logistics Rules: Demand surge pricing multiplier set to ${e.target.value}x`);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono cursor-pointer"
                          >
                            <option value="1.0">1.0x (Standard Tariff)</option>
                            <option value="1.2">1.2x (High Demand)</option>
                            <option value="1.5">1.5x (Peak Surge - Monsoon rains)</option>
                            <option value="2.0">2.0x (Extreme Emergency Weather)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-500 font-semibold mb-1">System Goods & Service Tax (GST %)</label>
                          <input
                            type="number"
                            value={taxPct}
                            onChange={(e) => {
                              setTaxPct(Number(e.target.value));
                              pushLog(`Taxation Rules: Global CGST+SGST set to ${e.target.value}%`);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Service areas management */}
                    <div className="border border-slate-150 p-4 rounded-xl space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Service Delivery Geo-Areas</h4>
                      <p className="text-[11px] text-slate-400">Manage list of active postal zip codes authorized to place orders.</p>
                      
                      <form onSubmit={handleAddPostalCode} className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="e.g. 560045"
                          value={newPostalCode}
                          onChange={(e) => setNewPostalCode(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                        />
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Code</span>
                        </button>
                      </form>

                      <div className="flex flex-wrap gap-1.5">
                        {postalCodes.map(code => (
                          <div key={code} className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1">
                            <span>{code}</span>
                            <button
                              onClick={() => handleRemovePostalCode(code)}
                              className="text-slate-400 hover:text-red-500 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* USER CONTENT & IMAGE MODERATION QUEUE */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>User Content & Reviews Moderation Queue ({reviewsQueue.length} Flagged)</span>
                    </h4>

                    {reviewsQueue.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4 text-center">Reviews content queue is clean!</p>
                    ) : (
                      <div className="space-y-2.5">
                        {reviewsQueue.map(review => (
                          <div key={review.id} className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-700">Client: {review.user} on {review.product}</span>
                              <span className="text-[9px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded border border-red-200">
                                Reason: {review.flaggedReason}
                              </span>
                            </div>
                            <p className="text-slate-600 italic">"{review.text}"</p>
                            
                            <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-100">
                              <button
                                onClick={() => handleModerateReview(review.id, 'Approve')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Approve Review
                              </button>
                              <button
                                onClick={() => handleModerateReview(review.id, 'Delete')}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[10px] font-bold border border-red-200 transition-all cursor-pointer"
                              >
                                Delete Review
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* CONTROLS & DATABASE SYSTEM TELEMETRY LOG (4 Columns on desktop) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* SYSTEM OPERATIONS RUNBOOK */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-3.5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-50">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Operational Overview</span>
            </h3>
            
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Toggle among options inside the command center tabs. Real Firestore writes update inventory levels immediately, while simulated systems track onboarding queues, geofence postal coordinates, and broadcast coupon codes.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Live Orders Listed</span>
                <span className="font-bold text-slate-800 font-mono">{orders.length}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Catalog Count</span>
                <span className="font-bold text-slate-800 font-mono">{products.length} items</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Riders / Drivers</span>
                <span className="font-bold text-slate-800 font-mono">{deliveryOpsCount}</span>
              </div>
            </div>
          </div>

          {/* REALTIME SYSTEM TELEMETRY LIVE FEED */}
          <div className="bg-slate-950 text-slate-100 rounded-2xl p-5 shadow-sm border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4.5 h-4.5 text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-wider font-mono text-indigo-300">Firestore Console logs</span>
              </div>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>

            {/* Logs stream */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto font-mono text-[9px] text-slate-400 scrollbar-none">
              {telemetryLog.map((log, idx) => (
                <div key={idx} className="leading-relaxed border-l-2 border-slate-800 pl-2">
                  {log}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>Latency: 14ms</span>
              <span>Cluster: US-CENTRAL1-A</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
