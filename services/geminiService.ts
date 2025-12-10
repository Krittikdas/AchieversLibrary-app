
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateWelcomeEmail = async (memberName: string, plan: string, branchName: string): Promise<string> => {
  try {
    const model = ai.models;
    const response = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a short, professional, and warm welcome email for a new library member named ${memberName} who joined the ${plan} subscription plan at ${branchName}. Mention that we hope this helps them with their studies/work. Keep it under 100 words.`,
    });
    return response.text || "Welcome to the library!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Welcome to our library! We are glad to have you.";
  }
};

export const generateReceiptSummary = async (items: string[], total: number): Promise<string> => {
  try {
    const model = ai.models;
    const response = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a text-based receipt summary for the following items: ${items.join(', ')}. Total amount: ₹${total}. Format it nicely with a thank you note.`,
    });
    return response.text || `Receipt: ₹${total} Paid.`;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Total Paid: ₹${total}`;
  }
};
