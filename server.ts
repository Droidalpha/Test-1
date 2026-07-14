import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { db } from './src/firebase';
import { seedProductsIfEmpty } from './src/data';

dotenv.config();

// Define port and host
const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize Gemini AI SDK if API key is present
  const geminiApiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY') {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini AI SDK successfully initialized.");
  } else {
    console.warn("GEMINI_API_KEY is not defined or is placeholder. AI Assistant features will have fallbacks.");
  }

  // --- API ROUTES ---

  // Get and seed products
  app.get('/api/products', async (req, res) => {
    try {
      const products = await seedProductsIfEmpty();
      res.json({ success: true, products });
    } catch (error: any) {
      console.error("Error fetching or seeding products:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Smart Produce Assistant / Recipes suggestor via Gemini
  app.post('/api/gemini/assistant', async (req, res) => {
    const { items, queryType, selectedProduct } = req.body;

    if (!ai) {
      return res.json({
        success: true,
        answer: "✨ **Offline/Simulated Assistant Feedback**:\n\nIt looks like your Gemini API key is not configured in the Secrets panel yet, but here is a fresh tip for you:\n- **Keep leafy greens fresh**: Wrap spinach or kale in dry paper towels and place in an airtight container to block excess humidity.\n- **Tomatoes care**: Never store heirloom tomatoes in the fridge; it weakens their cell walls and diminishes their aromatic farm-fresh flavor!"
      });
    }

    try {
      let prompt = "";
      let systemInstruction = "You are a warm, friendly local farmer and culinary expert at Greenwood Local Market. Keep your answers super concise, engaging, and structured with clean markdown. Never write long winded blocks. Use bullet points.";

      if (queryType === 'recipe') {
        const itemNames = items.map((i: any) => `${i.product.name} (x${i.quantity})`).join(', ');
        prompt = `I have the following fresh market ingredients in my cart: ${itemNames}. Suggest a simple, quick, and highly delicious farmhouse recipe I can make with these. List ingredients we might need to add, and 3 quick steps. Keep it under 200 words.`;
      } else if (queryType === 'freshness') {
        if (selectedProduct) {
          prompt = `Provide a pro-tip for storing and keeping this produce fresh for as long as possible: "${selectedProduct.name}" (${selectedProduct.description}). Make it extremely practical, brief (2-3 bullet points).`;
        } else {
          prompt = `Provide 3 general, high-impact storage hacks for keeping vegetables and leafy greens fresh.`;
        }
      } else {
        prompt = `Tell me a fun, fascinating fact about organic produce harvesting or local micro-farming. Keep it to 2-3 sentences.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      res.json({ success: true, answer: response.text });
    } catch (error: any) {
      console.error("Error calling Gemini:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server successfully started on http://${HOST}:${PORT} (NODE_ENV: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
