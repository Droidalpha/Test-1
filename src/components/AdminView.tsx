import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  Heart
} from 'lucide-react';
import { Order, Product, OrderStatus } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc, writeBatch, collection, getDocs, addDoc } from 'firebase/firestore';
import { INITIAL_PRODUCTS } from '../data';

interface AdminViewProps {
  orders: Order[];
  products: Product[];
  onResetDatabase: () => Promise<void>;
}

export default function AdminView({ orders, products, onResetDatabase }: AdminViewProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [telemetryLog, setTelemetryLog] = useState<string[]>([
    "System initialized successfully.",
    `Syncing Firestore Database ID: ai-studio-marketfresh-6f169c13-fb7a-4643-ac33-ff94545fcbb0`,
    `Database connection active. Current Catalog Count: ${products.length} items.`
  ]);

  // Analytics
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrderValue = orders.length > 0 ? (totalRevenue / orders.length) : 0;
  const transitCount = orders.filter(o => o.status === 'transit').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const orderedCount = orders.filter(o => o.status === 'ordered').length;
  const completedCount = orders.filter(o => o.status === 'delivered').length;
  const lowStockCount = products.filter(p => p.stock <= 5).length;

  const pushLog = (msg: string) => {
    setTelemetryLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 10)]);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      pushLog(`Order #${orderId.slice(0, 6)} status updated to [${status}].`);
    } catch (err) {
      console.error(err);
      pushLog(`ERROR updating order #${orderId.slice(0, 6)}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this order document?")) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        pushLog(`Order #${orderId.slice(0, 6)} document deleted permanently.`);
      } catch (err) {
        console.error(err);
        pushLog(`ERROR deleting order #${orderId.slice(0, 6)}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  const triggerFactoryReset = async () => {
    if (window.confirm("⚠️ WARNING: This will delete ALL orders and restore the product list catalog back to default! This is great for demo runs. Continue?")) {
      setIsResetting(true);
      pushLog("Triggering factory reset...");
      try {
        await onResetDatabase();
        pushLog("Factory reset finished. Catalog restored, orders purged!");
      } catch (err) {
        console.error(err);
        pushLog(`Factory reset failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="space-y-6" id="master-admin-dashboard">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/10">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">Administrative Command Center</h2>
            <p className="text-xs text-slate-500 mt-1">Cross-role auditing, system telemetry, and raw database overrides.</p>
          </div>
        </div>
        
        <div className="text-[10px] bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 font-semibold font-mono flex items-center gap-1.5 shrink-0">
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <span>PORT: 3000 | ENTERPRISE FIRESTORE</span>
        </div>
      </div>

      {/* OVERVIEW INTEL GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Gross Revenue</span>
            <DollarSign className="w-4.5 h-4.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-950 mt-2 font-display">
            ${totalRevenue.toFixed(2)}
          </div>
          <p className="text-[9px] text-slate-400 mt-1">From {orders.length} total orders placed</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Avg. Order Value</span>
            <TrendingUp className="w-4.5 h-4.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-slate-950 mt-2 font-display">
            ${avgOrderValue.toFixed(2)}
          </div>
          <p className="text-[9px] text-slate-400 mt-1">Reflecting item density in carts</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Active Deliveries</span>
            <Activity className="w-4.5 h-4.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-950 mt-2 font-display">
            {transitCount + preparingCount + orderedCount} <span className="text-xs font-semibold text-slate-400">active</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">In dispatch transit: {transitCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Completed Deliveries</span>
            <Check className="w-4.5 h-4.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-950 mt-2 font-display">
            {completedCount} <span className="text-xs font-semibold text-slate-400">delivered</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">Stock levels adjusted dynamically</p>
        </div>

      </div>

      {/* CENTRAL CORE SYSTEM AUDITING & TELEMETRY PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ORDERS DB MASTER OVERVIEW (8/12) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">Master Orders Audit ({orders.length})</h3>
            <span className="text-[9px] font-mono font-bold uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200">ADMIN CONTROL</span>
          </div>

          {orders.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <Clipboard className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-xs font-semibold">No order records exist in Firestore</p>
              <p className="text-[10px] mt-1 max-w-[240px] mx-auto">Open the Customer app to place orders and watch them populate live here!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/10">
                    <th className="py-3 px-5">ID / Customer</th>
                    <th className="py-3 px-4">Items Summary</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Rider Coordinates</th>
                    <th className="py-3 px-4">Status Override</th>
                    <th className="py-3 px-5 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {orders.map((o) => {
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/40 transition-colors">
                        
                        {/* ID and Customer */}
                        <td className="py-3 px-5">
                          <div className="font-mono font-black text-slate-900">#{o.id.slice(0, 6).toUpperCase()}</div>
                          <div className="font-semibold text-slate-800 mt-1">{o.customerName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">{o.deliveryAddress}</div>
                        </td>

                        {/* Items */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5 max-w-[180px]">
                            {o.items.map((it, idx) => (
                              <div key={idx} className="text-[10px] text-slate-500 truncate">
                                • {it.product.name} <span className="font-mono font-bold text-slate-700">x{it.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-extrabold text-slate-900">${o.totalAmount.toFixed(2)}</span>
                        </td>

                        {/* Coordinates */}
                        <td className="py-3 px-4 text-center font-mono text-[10px] text-slate-400">
                          {o.driverCoords ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                              ({o.driverCoords.lat.toFixed(0)}, {o.driverCoords.lng.toFixed(0)})
                            </span>
                          ) : (
                            <span className="text-slate-300">None (Locked)</span>
                          )}
                        </td>

                        {/* Status Toggle Override */}
                        <td className="py-3 px-4">
                          <select
                            value={o.status}
                            onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold cursor-pointer focus:outline-hidden focus:border-indigo-400"
                          >
                            <option value="ordered">Ordered</option>
                            <option value="preparing">Preparing</option>
                            <option value="transit">In Transit</option>
                            <option value="delivered">Delivered</option>
                          </select>
                        </td>

                        {/* Action delete */}
                        <td className="py-3 px-5 text-right">
                          <button
                            onClick={() => handleDeleteOrder(o.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete order document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CONTROLS & DATABASE SYSTEM LOG (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* DANGER OVERRIDES */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">System Operations</h3>
            
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Use these tools to clean up the workspace, restore product stocks, and test multiple role configurations from scratch.
            </p>

            <button
              onClick={triggerFactoryReset}
              disabled={isResetting}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                isResetting
                  ? 'bg-red-100 text-red-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'Purging Firestore...' : 'Clear orders & Reset Produce'}</span>
            </button>
          </div>

          {/* TELEMETRY CONSOLE PANEL */}
          <div className="bg-slate-950 text-slate-100 rounded-2xl p-5 shadow-xs border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4.5 h-4.5 text-indigo-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider font-mono text-indigo-300">Live Database Logs</span>
                </div>
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              </div>

              {/* Logs output */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto font-mono text-[9px] text-slate-400 scrollbar-none">
                {telemetryLog.map((log, idx) => (
                  <div key={idx} className="leading-normal break-all">
                    {log}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-500">
              <span>Syncing Latency: ~12ms</span>
              <span>Total Catalog: {products.length}</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
