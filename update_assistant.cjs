const fs = require('fs');

let content = fs.readFileSync('src/components/AssistantPanel.tsx', 'utf8');

// Replace the return statement
const returnRegex = /return \(\s*<div className="bg-white rounded-2xl border border-emerald-100 shadow-xs p-5" id="ai-assistant-panel">([\s\S]*?)\s*<\/div>\s*\);\s*\}/;

const newReturn = `
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
$1
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}`;

content = content.replace(returnRegex, newReturn);
fs.writeFileSync('src/components/AssistantPanel.tsx', content);
console.log("Updated");
