import React, { useState } from 'react';
import { Sparkles, MessageSquare, ChefHat, Heart, RefreshCw, AlertCircle, Activity, X, Bot } from 'lucide-react';
import { CartItem, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

interface AssistantPanelProps {
  cartItems: CartItem[];
  selectedProduct: Product | null;
}

const getNutrientsData = (product: Product) => {
  if (!product.calories && !product.protein) return null;
  
  let protein = product.protein || 0;
  let carbs = 0;
  let fat = 0;
  
  const nameLower = product.name.toLowerCase();
  if (nameLower.includes("atta") || nameLower.includes("wheat")) {
    carbs = 72;
    fat = 1.5;
  } else if (nameLower.includes("dal") || nameLower.includes("peas")) {
    carbs = 58;
    fat = 1.5;
  } else if (nameLower.includes("apple")) {
    carbs = 13.8;
    fat = 0.2;
  } else if (nameLower.includes("spinach")) {
    carbs = 3.6;
    fat = 0.4;
  } else {
    // Fallback estimation based on calorie and protein inputs
    carbs = Math.max(0, Math.round(((product.calories || 0) * 0.6) / 4));
    fat = Math.max(0, Math.round(((product.calories || 0) * 0.1) / 9));
  }
  
  return [
    { name: 'Protein', value: protein, unit: 'g', color: '#10b981' },
    { name: 'Carbs', value: carbs, unit: 'g', color: '#f59e0b' },
    { name: 'Fat', value: fat, unit: 'g', color: '#f43f5e' }
  ];
};

export default function AssistantPanel({ cartItems, selectedProduct }: AssistantPanelProps) {
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [customQuery, setCustomQuery] = useState('');

  const fetchAIHelp = async (specificQuery?: string) => {
    const queryToSend = specificQuery || customQuery;
    if (!queryToSend.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cartItems,
          queryType: 'ask',
          selectedProduct: selectedProduct,
          customQuery: queryToSend,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setAnswer(data.answer);
      } else {
        setAnswer("⚠️ Unable to connect with Greenwood Farm Assistant right now. Please try again soon!");
      }
    } catch (e) {
      console.error(e);
      setAnswer("⚠️ Connect failed. Ensure the server is running properly.");
    } finally {
      setLoading(false);
    }
  };

  // Simple custom Markdown formatter for bold terms, bullets, and emojis
  const formatMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let content = line.trim();
      if (!content) return <div key={idx} className="h-2" />;

      // Match headings/subheadings
      if (content.startsWith('###')) {
        return (
          <h4 key={idx} className="text-sm font-bold text-emerald-950 mt-3 mb-1 flex items-center gap-1.5 font-display">
            {content.replace('###', '').trim()}
          </h4>
        );
      }

      // Match bullet lists
      const isBullet = content.startsWith('- ') || content.startsWith('* ') || /^\d+\.\s/.test(content);
      if (isBullet) {
        // Strip off list prefixes
        const cleanContent = content.replace(/^(-\s|\*\s|\d+\.\s)/, '');
        
        // Formatter helper for bold text (**text**)
        const parts = cleanContent.split(/(\*\*.*?\*\*)/);
        const formattedParts = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pIdx} className="text-emerald-950 font-semibold">{part.slice(2, -2)}</strong>;
          }
          return part;
        });

        return (
          <li key={idx} className="ml-4 list-disc pl-1 text-xs leading-relaxed text-slate-700 mb-1.5 font-sans">
            {formattedParts}
          </li>
        );
      }

      // Standard paragraphs with bolding
      const parts = content.split(/(\*\*.*?\*\*)/);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="text-emerald-950 font-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <p key={idx} className="text-xs leading-relaxed text-slate-700 mb-2 font-sans">
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            drag
            dragMomentum={false}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-600 rounded-full shadow-lg flex items-center justify-center text-white cursor-pointer touch-none"
          >
            <Bot className="w-6 h-6" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-ping" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[380px] bg-white rounded-2xl border border-emerald-100 shadow-2xl p-5 shadow-emerald-900/10 touch-none"
            style={{ cursor: 'grab' }}
            whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
          >
            <div className="absolute -top-3 -right-3 z-10" onPointerDown={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 bg-white text-slate-500 hover:text-red-500 rounded-full shadow border border-slate-100 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div onPointerDown={(e) => e.stopPropagation()} className="cursor-default">
              {/* AI Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-display">ALPHAMART AI Assistant</h3>
                    <p className="text-[10px] text-emerald-700 font-sans">Ask anything about calories, protein diets, storage & recipes</p>
                  </div>
                </div>
                <div className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100/60 text-emerald-800 font-mono font-semibold">
                  Gemini Active
                </div>
              </div>

              {/* Target Product Reference Widget */}
              {selectedProduct && (
                <div className="flex items-center justify-between gap-2 mb-3 p-2 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-md object-cover border border-slate-100"
                    />
                    <div>
                      <h5 className="text-[10px] font-bold text-emerald-950 font-display leading-tight">{selectedProduct.name}</h5>
                      <span className="text-[8px] text-slate-400 font-mono uppercase">Selected Product</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setCustomQuery(`How many calories in ${selectedProduct.name}?`);
                        fetchAIHelp(`How many calories in ${selectedProduct.name}?`);
                      }}
                      className="text-[9px] bg-white border border-emerald-200 text-emerald-800 px-2 py-1 rounded-md font-medium hover:bg-emerald-50 cursor-pointer transition-colors"
                    >
                      🔥 Calories
                    </button>
                    <button
                      onClick={() => {
                        setCustomQuery(`Is ${selectedProduct.name} high in protein?`);
                        fetchAIHelp(`Is ${selectedProduct.name} high in protein?`);
                      }}
                      className="text-[9px] bg-white border border-emerald-200 text-emerald-800 px-2 py-1 rounded-md font-medium hover:bg-emerald-50 cursor-pointer transition-colors"
                    >
                      💪 Protein Info
                    </button>
                  </div>
                </div>
              )}

              {/* Nutritional Breakdown Recharts Bar Chart */}
              {selectedProduct && getNutrientsData(selectedProduct) && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Nutrition Composition</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-1.5 py-0.5 rounded">
                      🔥 {selectedProduct.calories} Calories
                    </span>
                  </div>
                  <div className="h-[96px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getNutrientsData(selectedProduct)!}
                        layout="vertical"
                        margin={{ top: 2, right: 10, left: -25, bottom: 2 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fill: '#475569', fontSize: 9, fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded shadow-md border border-slate-800">
                                  <span className="font-bold">{item.name}:</span> {item.value}{item.unit}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
                          {getNutrientsData(selectedProduct)!.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {selectedProduct.healthDetails && (
                    <p className="text-[9px] text-slate-500 leading-tight mt-1 pt-1.5 border-t border-dashed border-slate-200">
                      🌿 <span className="font-semibold text-slate-600">Health Tip:</span> {selectedProduct.healthDetails}
                    </p>
                  )}
                </div>
              )}

              {/* Custom Ask Query Bar */}
              <div className="mb-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customQuery.trim()) {
                      fetchAIHelp();
                    }
                  }}
                  className="flex gap-1.5"
                  onPointerDown={(e) => e.stopPropagation()} // Prevent drag conflict
                >
                  <input
                    type="text"
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder="Ask calories, high-protein diet, recipes..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white text-slate-800 placeholder-slate-400 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={loading || !customQuery.trim()}
                    className="px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </form>

                {/* Quick Suggestion Pills */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {[
                    "🥗 Best protein diet?",
                    "🔥 Spinach calories info",
                    "🥑 Healthy keto food list",
                    "👩‍🍳 Suggest custom recipe"
                  ].map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const cleanQuery = s.replace(/^[^\s]+\s/, ''); // Remove emoji
                        setCustomQuery(cleanQuery);
                        fetchAIHelp(cleanQuery);
                      }}
                      disabled={loading}
                      className="text-[9px] font-semibold bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-100 transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Response Display Box */}
              <div className="relative bg-slate-50/70 border border-slate-100 rounded-xl p-4 min-h-[140px] max-h-[300px] overflow-y-auto">
                {loading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-xl select-none">
                    <div className="relative flex items-center justify-center">
                      <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin" />
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500 absolute animate-pulse" />
                    </div>
                    <span className="text-[10px] text-emerald-800 font-semibold font-sans mt-3 animate-pulse">
                      Consulting ALPHAMART Health Expert...
                    </span>
                  </div>
                ) : answer ? (
                  <div className="prose prose-sm space-y-1">
                    {formatMarkdown(answer)}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-6 text-center select-none">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-2.5 shadow-xs">
                      <Bot className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h4 className="text-xs font-semibold text-slate-800 font-display">Ask me anything!</h4>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      Type your question above or choose a quick suggestion to get real-time info about food calories, protein content, or tailor-made recipes from our local farm basket!
                    </p>
                  </div>
                )}
              </div>

              {/* Cart info summary helper */}
              {cartItems.length > 0 && !answer && !loading && (
                <div className="flex items-center gap-1.5 mt-2.5 px-2.5 py-1.5 bg-emerald-50/50 rounded-lg border border-emerald-100/60 text-[9px] text-emerald-700 font-sans">
                  <Sparkles className="w-3 h-3 flex-shrink-0 animate-pulse" />
                  <span>You have {cartItems.reduce((s, i) => s + i.quantity, 0)} fresh produce items in your cart. Ask for custom recipes with them!</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
