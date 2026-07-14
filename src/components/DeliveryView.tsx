import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Truck, 
  MapPin, 
  User, 
  Phone, 
  Navigation, 
  Compass, 
  Play, 
  Pause, 
  Award, 
  DollarSign, 
  CheckCircle, 
  Clipboard, 
  Clock,
  Eye,
  Zap,
  Map
} from 'lucide-react';
import { Order, OrderStatus, DriverCoords } from '../types';
import { db } from '../firebase';
import { updateDoc, doc, collection, onSnapshot } from 'firebase/firestore';

interface DeliveryViewProps {
  orders: Order[];
}

const STREETS_ROUTE = [
  { name: "Market Hub (Departure)", lat: 80, lng: 80, heading: 90 },
  { name: "East Main Street Junction", lat: 80, lng: 120, heading: 180 },
  { name: "Central V-Road Avenue", lat: 130, lng: 120, heading: 90 },
  { name: "Central Plaza Intersection", lat: 130, lng: 250, heading: 180 },
  { name: "Sunny Meadows Lane", lat: 200, lng: 250, heading: 90 },
  { name: "Residence Entrance Gate", lat: 200, lng: 380, heading: 180 },
  { name: "Private S-Bend Lane", lat: 220, lng: 380, heading: 90 },
  { name: "Customer House (Arrived)", lat: 220, lng: 420, heading: 90 },
];

export default function DeliveryView({ orders }: DeliveryViewProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isAutopiloting, setIsAutopiloting] = useState(false);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);

  // Stats
  const [completedCount, setCompletedCount] = useState(() => parseInt(localStorage.getItem('rider_completed_count') || '0'));
  const [riderEarnings, setRiderEarnings] = useState(() => parseFloat(localStorage.getItem('rider_earnings') || '0.00'));

  const autopilotTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active orders (not delivered)
  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const completedOrders = orders.filter(o => o.status === 'delivered');

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || activeOrders[0] || null;

  useEffect(() => {
    if (selectedOrder && !selectedOrderId) {
      setSelectedOrderId(selectedOrder.id);
    }
  }, [selectedOrder, selectedOrderId]);

  // Cleanup autopilot on unmount
  useEffect(() => {
    return () => {
      if (autopilotTimerRef.current) clearInterval(autopilotTimerRef.current);
    };
  }, []);

  // Update localStorage stats when changed
  const recordSuccessfulDelivery = () => {
    const newCount = completedCount + 1;
    // Generate a random tip between $2.50 and $6.00
    const tip = parseFloat((2.50 + Math.random() * 3.50).toFixed(2));
    const baseFee = 5.00;
    const addedValue = baseFee + tip;
    const newEarnings = parseFloat((riderEarnings + addedValue).toFixed(2));

    setCompletedCount(newCount);
    setRiderEarnings(newEarnings);

    localStorage.setItem('rider_completed_count', newCount.toString());
    localStorage.setItem('rider_earnings', newEarnings.toString());

    // Dispatch a subtle customized local event or audio effect if needed
    alert(`🎉 Delivery completed! Earned $${baseFee.toFixed(2)} base delivery pay + $${tip.toFixed(2)} fresh-tip from the customer!`);
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      let driverCoordsPayload = null;
      if (status === 'transit') {
        // Set coordinates to start of route
        const startPt = STREETS_ROUTE[0];
        driverCoordsPayload = {
          lat: startPt.lat,
          lng: startPt.lng,
          heading: startPt.heading
        };
        setCurrentRouteIndex(0);
      } else if (status === 'delivered') {
        driverCoordsPayload = null;
        if (isAutopiloting) {
          stopAutopilot();
        }
        recordSuccessfulDelivery();
      }

      await updateDoc(orderRef, {
        status,
        driverCoords: driverCoordsPayload
      });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Broadcast specific GPS checkpoint manually
  const handleBroadcastCheckpoint = async (orderId: string, index: number) => {
    if (index < 0 || index >= STREETS_ROUTE.length) return;
    setCurrentRouteIndex(index);

    const checkpoint = STREETS_ROUTE[index];
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'transit',
        driverCoords: {
          lat: checkpoint.lat,
          lng: checkpoint.lng,
          heading: checkpoint.heading
        } as DriverCoords
      });
    } catch (err) {
      console.error("Failed to broadcast coordinate:", err);
    }
  };

  // Autopilot logic
  const startAutopilot = (orderId: string) => {
    if (isAutopiloting) return;
    setIsAutopiloting(true);

    let currentIndex = currentRouteIndex;
    if (currentIndex >= STREETS_ROUTE.length - 1) {
      currentIndex = 0;
      setCurrentRouteIndex(0);
    }

    autopilotTimerRef.current = setInterval(async () => {
      currentIndex++;
      if (currentIndex >= STREETS_ROUTE.length) {
        // Completed the whole route! Set as Delivered
        clearInterval(autopilotTimerRef.current!);
        autopilotTimerRef.current = null;
        setIsAutopiloting(false);
        setCurrentRouteIndex(0);
        await handleUpdateStatus(orderId, 'delivered');
        return;
      }

      setCurrentRouteIndex(currentIndex);
      const pt = STREETS_ROUTE[currentIndex];
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          status: 'transit',
          driverCoords: {
            lat: pt.lat,
            lng: pt.lng,
            heading: pt.heading
          }
        });
      } catch (err) {
        console.error(err);
      }
    }, 2500); // 2.5s step interval
  };

  const stopAutopilot = () => {
    if (autopilotTimerRef.current) {
      clearInterval(autopilotTimerRef.current);
      autopilotTimerRef.current = null;
    }
    setIsAutopiloting(false);
  };

  const resetRiderStats = () => {
    if (window.confirm("Reset rider wallet and delivery count?")) {
      setCompletedCount(0);
      setRiderEarnings(0);
      localStorage.setItem('rider_completed_count', '0');
      localStorage.setItem('rider_earnings', '0.00');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans" id="courier-rider-dashboard">
      
      {/* LEFT COLUMN: ORDERS LIST (5/12) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* WALLET / RIDER BADGE CARD */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md relative overflow-hidden">
          {/* Decorative glows */}
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/25 rounded-full blur-2xl" />
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-emerald-400">Greenwood Courier ID #409</span>
            </div>
            <button 
              onClick={resetRiderStats}
              className="text-[9px] font-semibold text-slate-400 hover:text-white"
            >
              Reset Stats
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-4 relative z-10">
            <div>
              <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Rider Wallet Balance</span>
              <span className="text-2xl font-black text-emerald-400 font-display flex items-center mt-1">
                <DollarSign className="w-5 h-5 -ml-1 stroke-[3]" />
                {riderEarnings.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Completed Shifts</span>
              <span className="text-2xl font-black text-white font-display mt-1 block">
                {completedCount} <span className="text-xs font-semibold text-slate-400">deliveries</span>
              </span>
            </div>
          </div>
        </div>

        {/* ACTIVE RUNNING ORDERS CONTAINER */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">Active Shipments ({activeOrders.length})</h3>
            <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-100 font-bold">Dispatch Sync</span>
          </div>

          {activeOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Truck className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-xs font-semibold">No active shipments pending</p>
              <p className="text-[10px] mt-1 max-w-[200px] mx-auto">Place an order as a Customer to push it to the delivery queue!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {activeOrders.map((o) => {
                const isSelected = selectedOrderId === o.id;
                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected 
                        ? 'bg-emerald-50/50 border-emerald-300 shadow-xs' 
                        : 'bg-slate-50 border-slate-200/50 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-black text-slate-800 text-[11px]">#{o.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase ${
                        o.status === 'ordered' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        o.status === 'preparing' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-emerald-600 text-white'
                      }`}>
                        {o.status === 'ordered' ? 'Ordered (Pending Pickup)' : o.status === 'preparing' ? 'Packing Order' : 'In Transit'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                        <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{o.customerName}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1 leading-tight">{o.deliveryAddress}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/40 flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">{o.items.length} items • ${o.totalAmount.toFixed(2)}</span>
                      <span className="text-emerald-700 font-bold">Select and Handle →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: COURIER GPS BROADCASTER & ROUTE CONTROLS (7/12) */}
      <div className="lg:col-span-7 space-y-6">
        {selectedOrder ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
            
            {/* ORDER FOCUS HEADER */}
            <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-display">Rider Order Assignment</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-emerald-800 font-extrabold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    #{selectedOrder.id.toUpperCase()}
                  </span>
                  <span className="text-slate-400 text-xs">•</span>
                  <span className="text-xs text-slate-500">Placed: {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Status workflow triggers */}
              <div className="flex gap-1">
                {selectedOrder.status === 'ordered' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    Accept & Pack Order
                  </button>
                )}
                {selectedOrder.status === 'preparing' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'transit')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Loaded! Start Transit</span>
                  </button>
                )}
                {selectedOrder.status === 'transit' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Complete Delivery</span>
                  </button>
                )}
              </div>
            </div>

            {/* CUSTOMER CONTACT CARD */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-xs">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Customer Information</h4>
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>{selectedOrder.customerName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{selectedOrder.customerPhone}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs border-t sm:border-t-0 sm:border-l border-slate-200/60 pt-3 sm:pt-0 sm:pl-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Delivery Location</h4>
                <div className="flex items-start gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                  <span className="leading-tight font-medium">{selectedOrder.deliveryAddress}</span>
                </div>
              </div>
            </div>

            {/* GPS ACTIVE TRANSMITTER BLOCK */}
            {selectedOrder.status === 'transit' ? (
              <div className="space-y-4 bg-emerald-50/30 border border-emerald-100 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-5 h-5 text-emerald-600 animate-spin-slow" />
                    <div>
                      <h4 className="text-xs font-extrabold text-emerald-950 font-display">Live GPS Broadcaster</h4>
                      <p className="text-[10px] text-emerald-700">Stream coordinates synchronously to customer tracking map.</p>
                    </div>
                  </div>

                  {/* Autopilot toggle */}
                  <button
                    onClick={() => isAutopiloting ? stopAutopilot() : startAutopilot(selectedOrder.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                      isAutopiloting
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isAutopiloting ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Stop Autopilot</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Autopilot Drive</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Progress road timeline list */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                    <span>Street Checkpoint Coords</span>
                    <span>Action</span>
                  </div>

                  <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                    {STREETS_ROUTE.map((pt, idx) => {
                      const isCurrent = currentRouteIndex === idx;
                      return (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg border flex items-center justify-between transition-colors text-xs ${
                            isCurrent
                              ? 'bg-emerald-100/60 border-emerald-300 text-emerald-950 font-bold'
                              : 'bg-white border-slate-200/50 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                              isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="truncate max-w-[200px]">{pt.name}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-slate-400">({pt.lat}, {pt.lng})</span>
                            <button
                              onClick={() => handleBroadcastCheckpoint(selectedOrder.id, idx)}
                              disabled={isAutopiloting}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                isCurrent
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 disabled:opacity-50'
                              }`}
                            >
                              Broadcast
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isAutopiloting && (
                  <div className="p-3 bg-white rounded-lg border border-emerald-100 text-[11px] text-emerald-800 font-medium font-sans animate-pulse flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Autopilot active: Progressing through streets every 2.5s. Open the Customer tab to observe the live-movement!</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                <Map className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>GPS Transmitter is locked. Click <strong>"Loaded! Start Transit"</strong> to enable the street route broadcasting controls.</span>
              </div>
            )}

            {/* BASKET ITEMS AUDIT TO PACK */}
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Groceries Packing Checklist</h4>
              <div className="space-y-2">
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-lg border border-slate-100 text-xs">
                    <div className="flex items-center gap-2.5">
                      <input 
                        type="checkbox" 
                        id={`it-pack-${idx}`}
                        className="w-4 h-4 rounded text-emerald-600 border-slate-300 cursor-pointer" 
                      />
                      <label htmlFor={`it-pack-${idx}`} className="font-bold text-slate-900 cursor-pointer">{it.product.name}</label>
                    </div>
                    <span className="font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                      Qty: {it.quantity} {it.product.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400 shadow-xs h-full flex flex-col justify-center">
            <Clipboard className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-700">No Assigned Delivery Selected</h4>
            <p className="text-[10px] max-w-[240px] mx-auto mt-1">Select an active delivery from the queue on the left side of the dashboard to view route maps, contacts, and live GPS broadcast.</p>
          </div>
        )}
      </div>

    </div>
  );
}
