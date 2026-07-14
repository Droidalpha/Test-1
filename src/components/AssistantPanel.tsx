import React, { useState } from 'react';
import { Sparkles, MessageSquare, ChefHat, Heart, RefreshCw, AlertCircle } from 'lucide-react';
import { CartItem, Product } from '../types';

interface AssistantPanelProps {
  cartItems: CartItem[];
  selectedProduct: Product | null;
}

export default function AssistantPanel({ cartItems, selectedProduct }: AssistantPanelProps) {
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recipe' | 'freshness' | 'trivia'>('recipe');

  const fetchAIHelp = async (type: 'recipe' | 'freshness' | 'trivia') => {
    setLoading(true);
    setActiveTab(type);
    try {
      const response = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cartItems,
          queryType: type,
          selectedProduct: type === 'freshness' ? selectedProduct : null,
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
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs p-5" id="ai-assistant-panel">
      {/* AI Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">Greenwood AI Farm Assistant</h3>
            <p className="text-[10px] text-emerald-700 font-sans">Expert storage hacks & recipe ideas in real-time</p>
          </div>
        </div>
        <div className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100/60 text-emerald-800 font-mono font-semibold">
          Gemini 3.5 Active
        </div>
      </div>

      {/* Button Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-50 rounded-xl mb-4">
        <button
          onClick={() => fetchAIHelp('recipe')}
          disabled={loading}
          className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
            activeTab === 'recipe' && answer
              ? 'bg-white text-emerald-700 shadow-xs border border-emerald-50'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span>Cart Recipes</span>
        </button>

        <button
          onClick={() => fetchAIHelp('freshness')}
          disabled={loading}
          className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
            activeTab === 'freshness' && answer
              ? 'bg-white text-emerald-700 shadow-xs border border-emerald-50'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Fresh Tips</span>
        </button>

        <button
          onClick={() => fetchAIHelp('trivia')}
          disabled={loading}
          className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
            activeTab === 'trivia' && answer
              ? 'bg-white text-emerald-700 shadow-xs border border-emerald-50'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Farm Trivia</span>
        </button>
      </div>

      {/* Initial state or AI Response display */}
      {!answer && !loading ? (
        <div className="bg-emerald-50/45 rounded-xl border border-dashed border-emerald-100 p-6 text-center select-none">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mx-auto mb-2.5 shadow-xs">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="text-xs font-semibold text-slate-800 font-display">Ask the Market Assistant</h4>
          <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
            Suggest farmhouse recipes with items in your cart, find preservation tricks, or learn trivia with one click!
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => fetchAIHelp('recipe')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Get Recipe
            </button>
            <button
              onClick={() => fetchAIHelp('freshness')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Storage Hacks
            </button>
          </div>
        </div>
      ) : (
        <div className="relative bg-slate-50/70 border border-slate-100 rounded-xl p-4 min-h-[140px] max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-xl select-none">
              <div className="relative flex items-center justify-center">
                <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin" />
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 absolute animate-pulse" />
              </div>
              <span className="text-[10px] text-emerald-800 font-semibold font-sans mt-3 animate-pulse">
                Consulting Greenwood Farmers...
              </span>
            </div>
          ) : (
            <div className="prose prose-sm">
              {activeTab === 'freshness' && selectedProduct && (
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200/50">
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-md object-cover border border-slate-100"
                  />
                  <div>
                    <h5 className="text-[10px] font-bold text-emerald-950 font-display leading-tight">{selectedProduct.name}</h5>
                    <span className="text-[9px] text-slate-400 font-mono uppercase">Target Produce</span>
                  </div>
                </div>
              )}
              <div className="space-y-1">
                {answer && formatMarkdown(answer)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cart helper warning when recipe tab is active and cart is empty */}
      {activeTab === 'recipe' && cartItems.length === 0 && (
        <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 bg-amber-50 rounded-lg border border-amber-100 text-[9px] text-amber-700 font-sans">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>Your cart is empty! Add fresh veggies to get a custom tailored farmhouse recipe.</span>
        </div>
      )}
    </div>
  );
}
