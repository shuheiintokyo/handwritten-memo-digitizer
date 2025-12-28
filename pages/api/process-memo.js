import Anthropic from "@anthropic-ai/sdk";
import { buildOptimizedPrompt } from "../../lib/prompts.js";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageBase64, refDocs = "", memoType = "general" } = req.body;

    // Validate inputs
    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "Claude API key not configured" });
    }

    // Build optimized system prompt based on memo type and reference docs
    const systemPrompt = buildOptimizedPrompt({
      memoType: memoType,
      referenceDocuments: refDocs,
      language: "ja",
      complexityLevel: "standard",
    });

    // Call Claude Vision API with Opus 4.1 for better accuracy
    const message = await client.messages.create({
      model: "claude-opus-4-1-20250805",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: "Please carefully read and transcribe this handwritten memo. Extract all text, understand relationships, identify company names and products, and flag anything unclear. Use the reference materials provided to help disambiguate terms.",
            },
          ],
        },
      ],
    });

    const extractedText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Calculate costs for Opus 4.1
    // Opus 4.1: input $0.003/1K tokens, output $0.015/1K tokens
    const inputCost =
      (message.usage.input_tokens * 0.003) / 1000;
    const outputCost =
      (message.usage.output_tokens * 0.015) / 1000;
    const totalCost = (inputCost + outputCost).toFixed(4);

    res.status(200).json({
      success: true,
      extracted_text: extractedText,
      tokens_used: {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
        total: message.usage.input_tokens + message.usage.output_tokens,
      },
      cost: totalCost,
      model: "claude-opus-4-1-20250805",
      memo_type: memoType,
    });
  } catch (error) {
    console.error("Error processing memo:", error);

    if (error.message.includes("401")) {
      return res.status(401).json({ error: "Invalid Claude API key" });
    }
    if (error.message.includes("rate_limit")) {
      return res
        .status(429)
        .json({ error: "Rate limited. Try again in 60s" });
    }

    res.status(500).json({ error: error.message });
  }
}