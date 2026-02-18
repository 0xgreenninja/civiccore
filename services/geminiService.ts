
import { GoogleGenAI, Type } from "@google/genai";
import { VerificationResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface EvidenceFile {
  data: string; // base64
  mimeType: string;
}

export const verifyImpactProof = async (
  description: string,
  files: EvidenceFile[] = []
): Promise<VerificationResult> => {
  // Using gemini-3-pro-preview for advanced forensic reasoning
  const model = 'gemini-3-pro-preview';
  
  const systemInstruction = `
    Act as a Senior Forensic Data Auditor specializing in blockchain impact verification.
    
    CRITICAL ANALYSIS REQUIREMENTS:
    1. IMAGE/VIDEO CONTENT: Analyze the visual evidence for consistency with the claim (e.g., if claiming a school was built, identify educational infrastructure).
    2. GEO-TAGGING: Look for visual indicators of the specific location (landmarks, flora, terrain) and verify if it matches the expected project region.
    3. METADATA FORENSICS: Check for signs of manipulation, deepfakes, or repurposing of old media.
    4. GPS COHERENCE: If any GPS data is implied or visible (in metadata or context), verify its validity.
    5. FRAUD DETECTION: Identify inconsistencies between the text claim and the provided media.
    
    OUTPUT FORMAT: Strictly JSON.
  `;

  const parts = [
    { text: `Milestone Claim: "${description}"` },
    ...files.map(file => ({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    }))
  ];

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN, description: "Final determination of proof authenticity" },
            confidenceScore: { type: Type.NUMBER, description: "Integrity score from 0-100" },
            hash: { type: Type.STRING, description: "Cryptographic anchor for the proof" },
            analysis: { type: Type.STRING, description: "Forensic summary" },
            detectedGeoLocation: { 
              type: Type.OBJECT,
              properties: {
                latitude: { type: Type.NUMBER },
                longitude: { type: Type.NUMBER },
                locationName: { type: Type.STRING },
                isConsistent: { type: Type.BOOLEAN }
              },
              required: ["isConsistent"]
            },
            forensicFlags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Markers of potential fraud or high trust"
            }
          },
          required: ["isValid", "confidenceScore", "hash", "analysis", "detectedGeoLocation"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    // Resolved: forensicFlags now exists in VerificationResult metadata via updated types.ts
    return {
      isValid: result.isValid,
      confidenceScore: result.confidenceScore,
      hash: result.hash,
      analysis: result.analysis,
      metadata: {
        gps: result.detectedGeoLocation.locationName || `lat: ${result.detectedGeoLocation.latitude || 0}, lng: ${result.detectedGeoLocation.longitude || 0}`,
        timestamp: Date.now(),
        forensicFlags: result.forensicFlags
      }
    };
  } catch (error) {
    console.error("Advanced AI Verification failed:", error);
    throw error;
  }
};