import React from 'react';
import { motion } from 'framer-motion';
import { Navigation, MapPin, Store, Compass } from 'lucide-react';
import { DriverCoords } from '../types';

interface DeliveryMapProps {
  driverCoords: DriverCoords | null;
  status: 'ordered' | 'preparing' | 'transit' | 'delivered';
}

export default function DeliveryMap({ driverCoords, status }: DeliveryMapProps) {
  // SVG grid dimensions
  const width = 500;
  const height = 300;

  // Key locations in our fictional map
  const marketCoords = { x: 80, y: 80 };
  const customerCoords = { x: 420, y: 220 };

  // Fictional local grid blocks (for layout decorations)
  const blocks = [
    { x: 30, y: 20, w: 90, h: 40, label: "Greenwood Park" },
    { x: 140, y: 20, w: 100, h: 40, label: "North Hills" },
    { x: 260, y: 20, w: 110, h: 40, label: "Riverside Market" },
    { x: 390, y: 20, w: 80, h: 40, label: "Pine Crest" },

    { x: 30, y: 140, w: 80, h: 50, label: "Warehouse Dist." },
    { x: 130, y: 140, w: 110, h: 50, label: "Central Plaza" },
    { x: 260, y: 140, w: 110, h: 50, label: "Oakwood Residential" },
    { x: 390, y: 140, w: 80, h: 50, label: "Sunny Meadows" },

    { x: 30, y: 240, w: 110, h: 40, label: "South End Shops" },
    { x: 160, y: 240, w: 130, h: 40, label: "Eco-Farms Hydroponics" },
    { x: 310, y: 240, w: 160, h: 40, label: "Riverfront Residences" },
  ];

  // Streets grid lines (horizontal and vertical roads)
  const roadsH = [70, 130, 200, 230];
  const roadsV = [120, 250, 380];

  // Fictional path checkpoints
  const routePoints = [
    { x: 80, y: 80 },    // Market
    { x: 120, y: 80 },   // East to main road
    { x: 120, y: 130 },  // South
    { x: 250, y: 130 },  // East
    { x: 250, y: 200 },  // South
    { x: 380, y: 200 },  // East
    { x: 380, y: 220 },  // South to house lane
    { x: 420, y: 220 },  // House
  ];

  // Helper to convert array of points to SVG path
  const getPathData = (points: { x: number; y: number }[]) => {
    return points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, "");
  };

  const fullRoutePath = getPathData(routePoints);

  // If status is not in transit or delivered, driver is still at market or prep station
  const currentPos = (() => {
    if (status === 'delivered') {
      return customerCoords;
    }
    if (status === 'transit' && driverCoords) {
      // Coords in types are (lat, lng) representing (y, x) scale in SVG
      // Let's map lat/lng appropriately or use the passed coordinates directly
      return { x: driverCoords.lng, y: driverCoords.lat };
    }
    return marketCoords;
  })();

  const angle = driverCoords?.heading ?? 0;

  return (
    <div className="relative bg-emerald-50/50 rounded-2xl border border-emerald-100 p-4 shadow-sm overflow-hidden" id="delivery-map-container">
      {/* Map Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'transit' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status === 'transit' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
          </span>
          <span className="text-xs font-semibold text-emerald-900 tracking-wide uppercase font-sans">
            {status === 'transit' ? 'Live Courier Tracking' : 'Local Neighborhood Map'}
          </span>
        </div>
        {status === 'transit' && driverCoords && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-mono bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
            <Compass className="w-3.5 h-3.5 animate-spin-slow" />
            <span>GPS Active</span>
          </div>
        )}
      </div>

      {/* SVG Map Canvas */}
      <div className="relative w-full aspect-[5/3] bg-emerald-50 border border-emerald-100 rounded-xl overflow-hidden shadow-inner">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
          {/* Defs for gradients/shadows */}
          <defs>
            <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cffafe" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>
            <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* BACKGROUND RIVER */}
          <path
            d="M -20,220 C 150,220 200,90 520,90"
            fill="none"
            stroke="url(#riverGrad)"
            strokeWidth="24"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M -20,220 C 150,220 200,90 520,90"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="4,8"
            opacity="0.4"
          />

          {/* BLOCKS/BUILDINGS */}
          {blocks.map((block, idx) => (
            <rect
              key={idx}
              x={block.x}
              y={block.y}
              width={block.w}
              height={block.h}
              rx="6"
              fill={block.label.includes("Park") || block.label.includes("Farms") ? "#f0fdf4" : "#f8fafc"}
              stroke={block.label.includes("Park") || block.label.includes("Farms") ? "#dcfce7" : "#e2e8f0"}
              strokeWidth="1"
            />
          ))}

          {/* BLOCK TEXTS (very tiny and aesthetic) */}
          {blocks.map((block, idx) => (
            <text
              key={`text-${idx}`}
              x={block.x + block.w / 2}
              y={block.y + block.h / 2 + 3}
              textAnchor="middle"
              className="fill-slate-400 font-sans font-medium select-none"
              style={{ fontSize: '7px' }}
            >
              {block.label}
            </text>
          ))}

          {/* ROADS STREETS */}
          {roadsH.map((y, idx) => (
            <line
              key={`rh-${idx}`}
              x1="-10"
              y1={y}
              x2="510"
              y2={y}
              stroke="#ffffff"
              strokeWidth="10"
              strokeLinecap="round"
            />
          ))}
          {roadsV.map((x, idx) => (
            <line
              key={`rv-${idx}`}
              x1={x}
              y1="-10"
              x2={x}
              y2="310"
              stroke="#ffffff"
              strokeWidth="10"
              strokeLinecap="round"
            />
          ))}

          {/* ROADS CENTER LINES */}
          {roadsH.map((y, idx) => (
            <line
              key={`rhc-${idx}`}
              x1="-10"
              y1={y}
              x2="510"
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="5,5"
            />
          ))}
          {roadsV.map((x, idx) => (
            <line
              key={`rvc-${idx}`}
              x1={x}
              y1="-10"
              x2={x}
              y2="310"
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="5,5"
            />
          ))}

          {/* FULL DELIVERY ROUTE PATH */}
          <path
            d={fullRoutePath}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* COMPLETED PATH HIGHLIGHT (Only active in transit) */}
          {status === 'transit' && (
            <path
              d={fullRoutePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8,6"
              className="animate-[dash_20s_linear_infinite]"
              style={{ strokeDashoffset: 100 }}
            />
          )}

          {/* WAREHOUSE/MARKET ICON PIN */}
          <g transform={`translate(${marketCoords.x}, ${marketCoords.y})`} filter="url(#dropShadow)">
            <circle cx="0" cy="0" r="14" fill="#059669" className="opacity-20 animate-ping" />
            <circle cx="0" cy="0" r="12" fill="#10b981" />
            <g transform="translate(-6, -6)">
              <Store className="w-3.5 h-3.5 text-white" />
            </g>
          </g>

          {/* HOME/CUSTOMER PIN */}
          <g transform={`translate(${customerCoords.x}, ${customerCoords.y})`} filter="url(#dropShadow)">
            <circle cx="0" cy="0" r="14" fill="#ef4444" className="opacity-20 animate-pulse" />
            <circle cx="0" cy="0" r="12" fill="#ef4444" />
            <g transform="translate(-6.5, -6.5)">
              <MapPin className="w-3.5 h-3.5 text-white fill-white" />
            </g>
          </g>

          {/* DRIVER MARKER */}
          {status !== 'delivered' && (
            <g transform={`translate(${currentPos.x}, ${currentPos.y})`} filter="url(#dropShadow)">
              {/* Pulsing signal halo */}
              <circle cx="0" cy="0" r="18" fill="#f59e0b" className="opacity-25 animate-ping" />
              
              {/* Direction Indicator */}
              <g transform={`rotate(${angle})`}>
                <polygon points="0,-12 -6,4 0,1 6,4" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
              </g>

              {/* Driver Capsule */}
              <circle cx="0" cy="0" r="10" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
              <g transform="translate(-5, -5)">
                <Navigation className="w-2.5 h-2.5 text-white fill-white rotate-45" />
              </g>
            </g>
          )}
        </svg>

        {/* Info badges floating on map */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 select-none">
          <div className="bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg shadow-xs border border-emerald-100 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-900">Greenwood Local Market</span>
          </div>
        </div>

        <div className="absolute top-3 right-3 select-none">
          <div className="bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg shadow-xs border border-red-100 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10px] font-bold text-red-900">Your Residence</span>
          </div>
        </div>
      </div>

      {/* Map Legend/Stats */}
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="bg-white/60 p-2 rounded-xl border border-emerald-100/55">
          <div className="text-[10px] text-emerald-800 font-sans font-medium uppercase tracking-wider">Start Point</div>
          <div className="text-xs font-bold text-slate-800 mt-0.5">Market Hub</div>
        </div>
        <div className="bg-white/60 p-2 rounded-xl border border-emerald-100/55">
          <div className="text-[10px] text-emerald-800 font-sans font-medium uppercase tracking-wider">Est. Travel Time</div>
          <div className="text-xs font-bold text-slate-800 mt-0.5">12-18 Mins</div>
        </div>
        <div className="bg-white/60 p-2 rounded-xl border border-emerald-100/55">
          <div className="text-[10px] text-emerald-800 font-sans font-medium uppercase tracking-wider">Status</div>
          <div className="text-xs font-bold text-emerald-700 capitalize mt-0.5">{status === 'transit' ? 'In Transit' : status === 'delivered' ? 'Delivered' : status}</div>
        </div>
      </div>
    </div>
  );
}
