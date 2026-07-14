import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit2, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  PlusCircle, 
  X, 
  Check, 
  RotateCcw, 
  Eye, 
  Inbox
} from 'lucide-react';
import { Product, Order } from '../types';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

interface OwnerViewProps {
  products: Product[];
  orders: Order[];
  onAdjustStock: (prodId: string, value: number) => Promise<void>;
}

export default function OwnerView({ products, orders, onAdjustStock }: OwnerViewProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');

  // Add Product form state
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Vegetables');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('lb');
  const [newProductStock, setNewProductStock] = useState('20');
  const [newProductFreshness, setNewProductFreshness] = useState('Harvested 4h ago');
  const [newProductOrganic, setNewProductOrganic] = useState(true);
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductUrl, setNewProductUrl] = useState('');

  // Local validation states
  const [formError, setFormError] = useState('');

  // Stats calculations
  const totalStockCount = products.reduce((acc, p) => acc + p.stock, 0);
  const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const lowStockProducts = products.filter(p => p.stock <= 5);
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  const categories = ['Fruits', 'Vegetables', 'Greens', 'Dairy & Farm', 'Bakery', 'Herbs', 'Pantry'];

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const price = parseFloat(newProductPrice);
    const stock = parseInt(newProductStock);

    if (isNaN(price) || price <= 0) {
      setFormError('Price must be a valid number greater than 0');
      return;
    }
    if (isNaN(stock) || stock < 0) {
      setFormError('Stock must be a positive integer');
      return;
    }

    const defaultImages: { [key: string]: string } = {
      Fruits: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&w=600&q=80',
      Vegetables: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=600&q=80',
      Greens: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80',
      'Dairy & Farm': 'https://images.unsplash.com/photo-1528750994873-1124024220f9?auto=format&fit=crop&w=600&q=80',
      Bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
      Herbs: 'https://images.unsplash.com/photo-1515589654462-a9881e276b8a?auto=format&fit=crop&w=600&q=80',
      Pantry: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80'
    };

    const imageUrl = newProductUrl.trim() || defaultImages[newProductCategory] || defaultImages['Vegetables'];

    try {
      const productPayload = {
        name: newProductName,
        category: newProductCategory,
        price,
        unit: newProductUnit,
        stock,
        freshness: newProductFreshness,
        organic: newProductOrganic,
        description: newProductDesc || 'Farm-fresh premium quality local harvest.',
        imageUrl,
        rating: 4.5 + Math.random() * 0.5 // Random initial rating between 4.5 and 5.0
      };

      await addDoc(collection(db, 'products'), productPayload);
      
      // Reset form fields
      setNewProductName('');
      setNewProductPrice('');
      setNewProductStock('20');
      setNewProductDesc('');
      setNewProductUrl('');
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to add product to Firestore:', err);
      setFormError('Failed to save to database. Please check connection.');
    }
  };

  const handleSavePrice = async (prodId: string) => {
    const priceVal = parseFloat(tempPrice);
    if (isNaN(priceVal) || priceVal <= 0) return;

    try {
      await updateDoc(doc(db, 'products', prodId), { price: priceVal });
      setEditingPriceId(null);
    } catch (err) {
      console.error('Failed to update price:', err);
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (window.confirm('Are you sure you want to remove this product from the farm catalog?')) {
      try {
        await deleteDoc(doc(db, 'products', prodId));
      } catch (err) {
        console.error('Failed to delete product:', err);
      }
    }
  };

  return (
    <div className="space-y-6" id="shop-owner-dashboard">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">Inventory Control Panel</h2>
          <p className="text-xs text-slate-500 mt-1">Manage real-time farm produce stock, prices, and organic catalog listings.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
          id="add-produce-button"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Produce</span>
        </button>
      </div>

      {/* OVERVIEW STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Total Catalog</span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-slate-950 mt-2 font-display">{products.length}</div>
          <p className="text-[9px] text-slate-400 mt-1">Active items synced online</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Total Stock Units</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-950 mt-2 font-display">{totalStockCount}</div>
          <p className="text-[9px] text-slate-400 mt-1">Available across all items</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Stock Valuation</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-950 mt-2 font-display">${totalValue.toFixed(2)}</div>
          <p className="text-[9px] text-slate-400 mt-1">Based on current pricing</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Stock Alerts</span>
            <AlertTriangle className={`w-4 h-4 ${outOfStockCount > 0 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`text-xl font-black mt-2 font-display ${outOfStockCount > 0 ? 'text-red-600' : 'text-slate-950'}`}>
            {outOfStockCount} <span className="text-xs font-semibold text-slate-500">out of stock</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">{lowStockProducts.length} items low stock (≤ 5)</p>
        </div>

      </div>

      {/* DETAILED STOCK DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">Live Inventory List ({products.length})</h3>
          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100 font-bold">Real-time sync</span>
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">No items found in database</p>
            <p className="text-[10px] text-slate-400 mt-1">Reset database in Admin Panel or add a new product above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/20 font-sans">
                  <th className="py-3 px-5">Produce</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Price per Unit</th>
                  <th className="py-3 px-4 text-center">In Stock</th>
                  <th className="py-3 px-4">Status & Freshness</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map((p) => {
                  const isEditingPrice = editingPriceId === p.id;
                  const isLowStock = p.stock <= 5;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors text-xs">
                      {/* Name and Image */}
                      <td className="py-3.5 px-5 flex items-center gap-3">
                        <img 
                          src={p.imageUrl} 
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-2xs shrink-0" 
                        />
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 font-display">
                            {p.name}
                            {p.organic && (
                              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-1 py-0.2 rounded border border-emerald-100 uppercase">Org</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 max-w-[200px]">{p.description}</div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/50">
                          {p.category}
                        </span>
                      </td>

                      {/* Price per Unit */}
                      <td className="py-3.5 px-4 text-right">
                        {isEditingPrice ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-slate-400">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={tempPrice}
                              onChange={(e) => setTempPrice(e.target.value)}
                              className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-right font-mono text-xs font-bold focus:outline-hidden focus:border-emerald-500"
                              autoFocus
                            />
                            <button 
                              onClick={() => handleSavePrice(p.id)}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => setEditingPriceId(null)}
                              className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="group/price flex items-center justify-end gap-1.5">
                            <span className="font-mono font-extrabold text-slate-900">${p.price.toFixed(2)}</span>
                            <span className="text-slate-400">/ {p.unit}</span>
                            <button
                              onClick={() => {
                                setEditingPriceId(p.id);
                                setTempPrice(p.price.toString());
                              }}
                              className="opacity-0 group-hover/price:opacity-100 p-1 text-slate-400 hover:text-emerald-600 rounded transition-opacity cursor-pointer"
                              title="Edit price"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Stock Adjuster */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onAdjustStock(p.id, Math.max(0, p.stock - 1))}
                            className="w-5 h-5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded flex items-center justify-center font-bold font-mono cursor-pointer transition-colors"
                            title="Decrease stock by 1"
                          >
                            -
                          </button>
                          <span className={`px-2.5 py-0.5 rounded-md font-mono font-bold text-center min-w-[36px] ${
                            p.stock === 0 ? 'bg-red-50 text-red-700 border border-red-100' :
                            isLowStock ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse' :
                            'bg-slate-50 text-slate-800 border border-slate-200/50'
                          }`}>
                            {p.stock}
                          </span>
                          <button
                            onClick={() => onAdjustStock(p.id, p.stock + 1)}
                            className="w-5 h-5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded flex items-center justify-center font-bold font-mono cursor-pointer transition-colors"
                            title="Increase stock by 1"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Status / Freshness */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[10px] font-semibold ${p.stock === 0 ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {p.stock === 0 ? '🚫 Out of Stock' : isLowStock ? '⚠️ Restock Soon' : '✅ Healthy Stock'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">{p.freshness}</span>
                        </div>
                      </td>

                      {/* Catalog Action buttons */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onAdjustStock(p.id, 0)}
                            className="px-2 py-1 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded font-bold text-[9px] uppercase tracking-wide cursor-pointer border border-transparent hover:border-slate-200/50"
                            title="Mark out of stock instantly"
                          >
                            Set Out
                          </button>
                          <button
                            onClick={() => onAdjustStock(p.id, 50)}
                            className="px-2 py-1 hover:bg-emerald-50 text-emerald-600 rounded font-bold text-[9px] uppercase tracking-wide cursor-pointer border border-transparent hover:border-emerald-100"
                            title="Restock +50 units instantly"
                          >
                            +50
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete listing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECENT OUTGOING SHIPMENTS WARNING FOR STOCK CHECKING */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 font-display">Active Customer Orders ({orders.filter(o => o.status !== 'delivered').length})</h3>
        {orders.filter(o => o.status !== 'delivered').length === 0 ? (
          <p className="text-xs text-slate-400">No active orders awaiting preparation right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.filter(o => o.status !== 'delivered').map((o) => (
              <div key={o.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-emerald-800 font-extrabold text-[11px]">ORDER #{o.id.slice(0,6).toUpperCase()}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-100 capitalize">
                      {o.status}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-800 mt-1">Recipient: {o.customerName}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">Address: {o.deliveryAddress}</div>
                  
                  {/* Items count bullet list */}
                  <div className="mt-2 space-y-1">
                    {o.items.map((it, idx) => (
                      <div key={idx} className="text-[10px] text-slate-600 flex justify-between">
                        <span>• {it.product.name}</span>
                        <span className="font-mono font-semibold">x{it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/50 flex justify-between items-center text-[11px] font-bold">
                  <span className="text-slate-400">Total Revenue:</span>
                  <span className="font-mono text-slate-950">${o.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD PRODUCE MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed inset-x-4 top-10 sm:top-20 md:max-w-xl md:mx-auto bg-white rounded-3xl z-50 p-6 shadow-2xl border border-slate-100 overflow-y-auto max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-display">Add Produce Listing</h3>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-100 text-[11px] font-bold text-red-600">
                  {formError}
                </div>
              )}

              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Produce Name *</label>
                    <input
                      type="text"
                      required
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="e.g. Organic Honeycrisp Apples"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-medium focus:outline-hidden focus:border-emerald-300 focus:bg-white"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category *</label>
                    <select
                      value={newProductCategory}
                      onChange={(e) => setNewProductCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-medium focus:outline-hidden focus:border-emerald-300 focus:bg-white cursor-pointer"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price per Unit ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(e.target.value)}
                      placeholder="e.g. 3.49"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-medium focus:outline-hidden focus:border-emerald-300 focus:bg-white"
                    />
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit of Measure *</label>
                    <input
                      type="text"
                      required
                      value={newProductUnit}
                      onChange={(e) => setNewProductUnit(e.target.value)}
                      placeholder="e.g. lb, bunch, dozen, pint, loaf"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-medium focus:outline-hidden focus:border-emerald-300 focus:bg-white"
                    />
                  </div>

                  {/* Stock */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Initial Stock *</label>
                    <input
                      type="number"
                      required
                      value={newProductStock}
                      onChange={(e) => setNewProductStock(e.target.value)}
                      placeholder="e.g. 30"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-medium focus:outline-hidden focus:border-emerald-300 focus:bg-white"
                    />
                  </div>

                  {/* Freshness */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Freshness / Harvest description *</label>
                    <input
                      type="text"
                      required
                      value={newProductFreshness}
                      onChange={(e) => setNewProductFreshness(e.target.value)}
                      placeholder="e.g. Harvested 4h ago, Laid yesterday"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-medium focus:outline-hidden focus:border-emerald-300 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Organic Switch */}
                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="new-organic-checkbox"
                    checked={newProductOrganic}
                    onChange={(e) => setNewProductOrganic(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="new-organic-checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    Certified USDA Organic Produce
                  </label>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Custom Image URL (Optional)</label>
                  <input
                    type="url"
                    value={newProductUrl}
                    onChange={(e) => setNewProductUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... (leave blank for beautiful category default)"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-medium focus:outline-hidden focus:border-emerald-300 focus:bg-white"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                  <textarea
                    value={newProductDesc}
                    onChange={(e) => setNewProductDesc(e.target.value)}
                    placeholder="Provide delicious highlights of this farm-fresh produce listing..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-medium focus:outline-hidden focus:border-emerald-300 focus:bg-white"
                  />
                </div>

                {/* Submit buttons */}
                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Save Listing
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
