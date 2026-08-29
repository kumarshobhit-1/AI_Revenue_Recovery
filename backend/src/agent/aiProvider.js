import { validateAIDiagnosis } from './schemas/diagnosisSchema.js';
import { getRuleBasedDiagnosis } from './ruleFallback.js';

// Builds system & user prompt for AI Failure Diagnosis.
export const buildDiagnosticPrompt = (context) => {
  return `You are RecoverAI, an expert financial AI Agent specializing in payment failure diagnosis and revenue recovery.
Analyze the following structured payment failure event context:

Payment Context:
- Payment ID: ${context.paymentId}
- Amount: ${context.currency} ${context.amount}
- Failure Reason / Error Code: ${context.failureReason} (${context.gatewayErrorCode || 'N/A'})
- Customer LTV: ${context.currency} ${context.customer?.ltv || 0}
- Customer History: ${context.customer?.successfulTxnCount || 0} successful / ${context.customer?.failedTxnCount || 0} failed
- Customer Opt-Out Status: ${context.customer?.isOptedOut ? 'OPTED_OUT' : 'ACTIVE'}
- Previous Retry Attempts: ${context.previousAttempts || 0}

Respond STRICTLY in valid JSON matching this exact structure:
{
  "classification": "SHORT_UPPERCASE_CATEGORY",
  "confidenceScore": 0.88,
  "recommendedAction": "SCHEDULE_RETRY" | "SEND_NOTIFICATION" | "GENERATE_RECOVERY_LINK" | "ESCALATE_TO_MERCHANT" | "STOP_WORKFLOW",
  "suggestedDelayMinutes": 360,
  "suggestedChannel": "EMAIL" | "SMS" | "WHATSAPP" | null,
  "rationale": [
    "Bullet point explanation 1",
    "Bullet point explanation 2"
  ]
}

DO NOT include markdown block wrappers or extra conversational text outside the JSON.`;
};

export const aiProvider = {
  // Main entry point for AI Failure Diagnosis.
  async diagnose(context, options = {}) {
    if (options?.isBenchmark || context?.isBenchmark) {
      return this.diagnoseMock(context);
    }

    const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();

    try {
      if (provider === 'mock') {
        return this.diagnoseMock(context);
      } else if (provider === 'gemini') {
        return await this.diagnoseGemini(context);
      } else if (provider === 'openrouter') {
        return await this.diagnoseOpenRouter(context);
      } else if (provider === 'openai') {
        return await this.diagnoseOpenAI(context);
      }

      return getRuleBasedDiagnosis(context);
    } catch (error) {
      console.warn(`[AI Provider Warning] ${provider} diagnosis failed or timed out. Falling back to RuleEngine:`, error.message);
      return getRuleBasedDiagnosis(context);
    }
  },

  // Mock AI Diagnostic Engine (Deterministic & Fast for local dev/testing)
  diagnoseMock(context) {
    return getRuleBasedDiagnosis(context);
  },

  // Google Gemini API Integration
  async diagnoseGemini(context) {
    const apiKey = process.env.AI_API_KEY;
    let modelName = process.env.AI_MODEL || 'gemini-2.0-flash';
    if (modelName.includes('mock') || modelName === 'gemini-1.5-flash') {
      modelName = 'gemini-2.0-flash';
    }

    if (!apiKey || apiKey.includes('mock') || apiKey.includes('YourActual') || apiKey.length < 20) {
      console.warn('[AI Provider Notice] Real Gemini API Key not configured in backend/.env. Using Expert Rule Engine.');
      return getRuleBasedDiagnosis(context);
    }

    const prompt = buildDiagnosticPrompt(context);
    
    // Model fallback candidates for Google Gemini API
    const candidateModels = [modelName, 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-pro'];
    let lastError = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody?.error?.message || `Gemini API HTTP Error ${response.status}`);
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error('Empty response from Gemini API');

        const parsedJson = JSON.parse(rawText);
        const validated = validateAIDiagnosis(parsedJson);
        console.log(`[Gemini Live AI Diagnosis (${model})] Classification: ${validated.classification} | Confidence: ${validated.confidenceScore} | Action: ${validated.recommendedAction}`);
        return validated;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to query Gemini API');
  },

  // OpenRouter API Integration
  async diagnoseOpenRouter(context) {
    const apiKey = process.env.AI_API_KEY;
    const rawModel = process.env.AI_MODEL || 'google/gemini-flash-1.5';
    const modelName = rawModel.includes('mock') ? 'google/gemini-flash-1.5' : rawModel;

    if (!apiKey || apiKey.includes('mock') || apiKey.includes('YourActual')) {
      console.warn('[AI Provider Notice] Real OpenRouter API Key not configured in backend/.env. Using Expert Rule Engine.');
      return getRuleBasedDiagnosis(context);
    }

    const prompt = buildDiagnosticPrompt(context);
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `OpenRouter API HTTP Error ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content;
    if (!rawText) throw new Error('Empty response from OpenRouter API');

    const parsedJson = JSON.parse(rawText);
    return validateAIDiagnosis(parsedJson);
  },

  // OpenAI API Integration
  async diagnoseOpenAI(context) {
    const apiKey = process.env.AI_API_KEY;
    const rawModel = process.env.AI_MODEL || 'gpt-4o-mini';
    const modelName = rawModel.includes('mock') ? 'gpt-4o-mini' : rawModel;

    if (!apiKey || apiKey.includes('mock') || apiKey.includes('YourActual')) {
      console.warn('[AI Provider Notice] Real OpenAI API Key not configured in backend/.env. Using Expert Rule Engine.');
      return getRuleBasedDiagnosis(context);
    }

    const prompt = buildDiagnosticPrompt(context);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `OpenAI API HTTP Error ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content;
    if (!rawText) throw new Error('Empty response from OpenAI API');

    const parsedJson = JSON.parse(rawText);
    return validateAIDiagnosis(parsedJson);
  },
};
