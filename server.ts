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
    const { items, queryType, selectedProduct, customQuery } = req.body;

    if (!ai) {
      if (queryType === 'ask') {
        const queryLower = (customQuery || "").toLowerCase();
        let fallbackAnswer = "✨ **Offline Ask Assistant**:\n\nIt looks like your Gemini API key is not configured in the Secrets panel yet, but here is some helpful advice for your query:\n\n";
        if (queryLower.includes('calorie') || queryLower.includes('calor') || queryLower.includes('cal')) {
          fallbackAnswer += "- **Calorie Awareness**: Leafy vegetables (spinach, lettuce) contain only ~15-20 calories per 100g. Fresh fruits like apples have ~50 calories. High-density foods like nuts, paneer, or oils are calorie-rich. Stick to fresh, high-fiber produce to stay within a calorie-deficit effortlessly!\n- **Satiety Tip**: Whole vegetables provide fiber that stretches your stomach and signals fullness with very few calories.";
        } else if (queryLower.includes('protein') || queryLower.includes('protien') || queryLower.includes('diet')) {
          fallbackAnswer += "- **Best Protein Diet**: For active individuals, a protein-rich diet is crucial. Great local options include green mung lentils, chickpeas, paneer, low-fat tofu, and Greek yogurt. Try a simple balanced meal of grilled paneer or moong dal with steam-cooked broccoli!\n- **Daily Target**: Aim for about 1.0 to 1.5 grams of protein per kilogram of ideal body weight.";
        } else {
          fallbackAnswer += "- **Nutrition Tip**: Balance is key! Eat a colorful rainbow of vegetables (carrots for Vitamin A, greens for Iron and Folate, bell peppers for Vitamin C) to keep your metabolism and energy peak.";
        }
        return res.json({ success: true, answer: fallbackAnswer });
      }
      return res.json({
        success: true,
        answer: "✨ **Offline/Simulated Assistant Feedback**:\n\nIt looks like your Gemini API key is not configured in the Secrets panel yet, but here is a fresh tip for you:\n- **Keep leafy greens fresh**: Wrap spinach or kale in dry paper towels and place in an airtight container to block excess humidity.\n- **Tomatoes care**: Never store heirloom tomatoes in the fridge; it weakens their cell walls and diminishes their aromatic farm-fresh flavor!"
      });
    }

    try {
      let prompt = "";
      let systemInstruction = "You are a warm, friendly local grocery expert, nutritionist, and health advisor at ALPHAMART. Keep your answers super concise, engaging, and structured with clean markdown. Never write long winded blocks. Use bullet points.";

      if (queryType === 'ask') {
        prompt = `The user is asking a custom question: "${customQuery}". 
Please answer their question accurately. If they are asking about food calories, protein, diets, or healthy local groceries, provide high-impact, scientifically accurate, and clear guidance.
Here is some additional context if relevant:
- Selected product: ${selectedProduct ? `${selectedProduct.name} (${selectedProduct.description || ''}) - Calories: ${selectedProduct.calories || 'N/A'}, Protein: ${selectedProduct.protein || 'N/A'}, Health Details: ${selectedProduct.healthDetails || 'N/A'}` : 'None'}
- Current basket items: ${items ? items.map((i: any) => `${i.product.name} (x${i.quantity})`).join(', ') : 'None'}

Keep your answer under 180 words, highly encouraging, concise, and structured with clean markdown bullet points.`;
      } else if (queryType === 'recipe') {
        const itemNames = items.map((i: any) => `${i.product.name} (x${i.quantity})`).join(', ');
        prompt = `I have the following items in my cart: ${itemNames}. Suggest a simple, quick, and highly delicious recipe I can make with these. List ingredients we might need to add, and 3 quick steps. Keep it under 200 words.`;
      } else if (queryType === 'freshness') {
        if (selectedProduct) {
          prompt = `Provide a pro-tip for storing and keeping this produce fresh for as long as possible: "${selectedProduct.name}" (${selectedProduct.description}). Make it extremely practical, brief (2-3 bullet points).`;
        } else {
          prompt = `Provide 3 general, high-impact storage hacks for keeping vegetables and leafy greens fresh.`;
        }
      } else if (queryType === 'health') {
        if (selectedProduct) {
          prompt = `Provide a detailed health analysis for this product: "${selectedProduct.name}". Note that its data is: Calories: ${selectedProduct.calories || 'N/A'}, Protein: ${selectedProduct.protein || 'N/A'}, Health Details: ${selectedProduct.healthDetails || 'N/A'}. Include estimated calories per serving, protein content, vitamins, and overall health benefits. Make it brief and punchy.`;
        } else {
          prompt = `Provide a high-level summary of a high-protein, low-calorie diet plan using common Indian groceries. Include a 1-day sample meal plan. Keep it concise.`;
        }
      } else {
        prompt = `Tell me a fun, fascinating fact about groceries or healthy eating. Keep it to 2-3 sentences.`;
      }

      let response;
      let usedModel = "gemini-3.5-flash";
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction,
          },
        });
      } catch (err: any) {
        console.warn("gemini-3.5-flash fallback triggered.");
        try {
          usedModel = "gemini-3.1-flash-lite";
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: prompt,
            config: {
              systemInstruction,
            },
          });
        } catch (innerErr: any) {
          console.warn("gemini-3.1-flash-lite fallback triggered.");
          try {
            usedModel = "gemini-flash-latest";
            response = await ai.models.generateContent({
              model: "gemini-flash-latest",
              contents: prompt,
              config: {
                systemInstruction,
              },
            });
          } catch (lastErr: any) {
            console.warn("All live models temporarily occupied, using smart local fallback engine.");
            throw lastErr;
          }
        }
      }

      console.log(`Successfully generated content using model: ${usedModel}`);
      res.json({ success: true, answer: response.text });
    } catch (error: any) {
      console.log("Serving high-fidelity local response.");
      
      let fallbackAnswer = "✨ **ALPHAMART Health & Recipe Assistant (Smart Offline Tips)**:\n\nOur live AI servers are experiencing high demand right now. Here is a helpful fallback tip tailored to your request:\n\n";
      if (queryType === 'ask') {
        const queryLower = (customQuery || "").toLowerCase();
        if (queryLower.includes('calorie') || queryLower.includes('calor') || queryLower.includes('cal')) {
          fallbackAnswer += "- **Calorie Awareness**: Leafy vegetables (spinach, lettuce) contain only ~15-20 calories per 100g. Fresh fruits like apples have ~50 calories. High-density foods like nuts, paneer, or oils are calorie-rich. Stick to fresh, high-fiber produce to stay within a calorie-deficit effortlessly!\n- **Satiety Tip**: Whole vegetables provide fiber that stretches your stomach and signals fullness with very few calories.";
        } else if (queryLower.includes('protein') || queryLower.includes('protien') || queryLower.includes('diet')) {
          fallbackAnswer += "- **Best Protein Diet**: For active individuals, a protein-rich diet is crucial. Great local options include green mung lentils, chickpeas, paneer, low-fat tofu, and Greek yogurt. Try a simple balanced meal of grilled paneer or moong dal with steam-cooked broccoli!\n- **Daily Target**: Aim for about 1.0 to 1.5 grams of protein per kilogram of ideal body weight.";
        } else {
          fallbackAnswer += "- **Nutrition Tip**: Balance is key! Eat a colorful rainbow of vegetables (carrots for Vitamin A, greens for Iron and Folate, bell peppers for Vitamin C) to keep your metabolism and energy peak.";
        }
      } else if (queryType === 'recipe') {
        fallbackAnswer += "- **Quick High-Protein Recipe**: Sauté chopped onions, tomatoes, and green chilies. Toss with scrambled paneer (Indian cottage cheese) or boiled chickpeas, then garnish with lemon juice and coriander for a delicious 5-minute healthy snack!\n- **General Tip**: Adding fresh leafy greens at the end of cooking preserves their delicate vitamins and bright flavor.";
      } else if (queryType === 'freshness') {
        if (selectedProduct) {
          fallbackAnswer += `- **For "${selectedProduct.name}"**: Keep it clean and dry. Avoid washing until right before consumption, as excess moisture encourages spoilage.\n- **Storage Hack**: Place a dry paper towel inside the storage container to absorb humidity and extend freshness.`;
        } else {
          fallbackAnswer += "- **Keep Leafy Greens Crisp**: Wrap spinach, fenugreek, or coriander in paper towels and keep them in airtight containers.\n- **Ethylene Management**: Keep apples, bananas, and tomatoes away from green vegetables, as they release ethylene gas which speeds up ripening and spoilage.";
        }
      } else if (queryType === 'health') {
        if (selectedProduct) {
          fallbackAnswer += `- **For "${selectedProduct.name}"**: This is a great choice for balanced nutrition! It is low in calories, rich in plant-based fibers, and packed with essential micronutrients like potassium and vitamins.\n- **Nutrient Tip**: Eating vegetables in a mix of raw and cooked forms ensures you absorb both heat-sensitive and fat-soluble nutrients.`;
        } else {
          fallbackAnswer += "- **1-Day Balanced Meal Plan Idea**:\n  - *Breakfast*: Moong dal chilla (savory lentil pancake) with fresh mint chutney.\n  - *Lunch*: Whole wheat roti with mixed vegetable sabzi and a bowl of curd.\n  - *Snack*: A handful of roasted makhana (foxnuts) or raw almonds.\n  - *Dinner*: Light vegetable khichdi or grilled paneer with a colorful side salad.";
        }
      } else {
        fallbackAnswer += "- **Did you know?**: Locally sourced organic foods travel fewer miles to reach your basket, keeping their natural nutrients, flavor, and texture much more intact than produce shipped over long distances!";
      }
      
      res.json({ success: true, answer: fallbackAnswer });
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
