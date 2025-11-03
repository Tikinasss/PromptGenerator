import { NextResponse } from 'next/server';

// Types
interface GenerateRequest {
  profile: string;
  goal: string;
  level: string;
  context?: string;
  constraints?: string;
}

interface GenerateResponse {
  thinking: string;
  prompt: string;
}

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();
    const { profile, goal, level, context, constraints } = body;

    if (!profile || !goal) {
      return NextResponse.json({ error: 'Profil et objectif sont requis' }, { status: 400 });
    }

    const systemPrompt = `Tu es PromptForge, un expert en ingénierie de prompts pour modèles d'IA.`;

    const userPrompt = `Crée un prompt optimisé pour ce cas d'usage :\n\n` +
      `Profil utilisateur : ${profile}\n` +
      `Niveau d'expertise : ${level}\n` +
      `Objectif principal : ${goal}\n` +
      `${context ? `Contexte additionnel : ${context}\n` : ''}` +
      `${constraints ? `Contraintes : ${constraints}\n` : ''}`;

    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GROQ_API_KEY;
    const apiUrl = process.env.API_URL || 'https://api.openai.com/v1/chat/completions';
    const model = process.env.MODEL_NAME || 'gpt-4o-mini';

    if (!apiKey) {
      return NextResponse.json({ error: 'Configuration API manquante', details: "Aucune clé API trouvée dans les variables d'environnement." }, { status: 500 });
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json({ error: 'Erreur API externe', status: response.status, details: text }, { status: 502 });
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return NextResponse.json({ thinking: 'Analyse non fournie en JSON', prompt: text });
    }

    const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';

    let result: GenerateResponse | null = null;
    try {
      result = JSON.parse(content);
    } catch (e) {
      result = { thinking: 'Analyse fournie (raw)', prompt: typeof content === 'string' ? content : JSON.stringify(content) };
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la génération du prompt', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export const runtime = 'edge';
