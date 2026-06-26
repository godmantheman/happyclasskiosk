import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase limit to allow base64 images
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// AI Coin Recognition Endpoint
app.post("/api/analyze-coin", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // Clean base64 string (strip data url scheme if present)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
      You are an advanced AI vision module integrated into an automatic smart kiosk.
      Your task is to analyze the provided image, identify any South Korean coins or bills (or generic currency coins with numbers 100, 500, 1000, 5000, 10000, 50000), and extract their monetary values.

      Rules for Recognition:
      1. Look for numeric text elements such as "100", "500", "1000", "5000", "10000", "50000".
      2. If you find these numbers on coins or bills, confirm they are valid currency.
      3. CRITICAL: The coins/bills may be rotated, flipped, folded, or completely upside down (뒤집혀져 있음). You must identify the value correctly regardless of their orientation or angle.
      4. If you see multiple coins or bills, identify each one and sum them up.
      5. If no valid currency coin or bill containing the target numbers (100, 500, 1000, 5000, 10000, 50000) is visible, do not recognize it (total sum must be 0, and the list of detected objects must be empty).
      
      Respond STRICTLY in the specified JSON format.
    `;

    // Call Gemini with multimodal input
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detected: {
              type: Type.ARRAY,
              description: "List of all detected coins/bills in the image",
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: "Whether it is 'coin' or 'bill'",
                  },
                  value: {
                    type: Type.INTEGER,
                    description: "The numeric face value (e.g., 100, 500, 1000, 5000, 10000, 50000)",
                  },
                  orientation: {
                    type: Type.STRING,
                    description: "Orientation state of the item (e.g., upside-down, rotated, normal)",
                  },
                },
                required: ["type", "value", "orientation"],
              },
            },
            total: {
              type: Type.INTEGER,
              description: "The total sum of all recognized coins/bills. Must be 0 if none recognized.",
            },
            explanation: {
              type: Type.STRING,
              description: "Brief reason in Korean explaining what was found, e.g., '1000원 지폐 1장과 500원 동전 1개가 발견되었습니다. (뒤집힘)'",
            },
          },
          required: ["detected", "total", "explanation"],
        },
      },
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText.trim());

    res.json(resultJson);
  } catch (error: any) {
    console.error("Gemini API coin analysis error:", error);
    res.status(500).json({
      error: "AI Coin Recognition failed",
      details: error.message || error,
    });
  }
});

// Vite Middleware & Static Asset configuration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AI Kiosk Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
