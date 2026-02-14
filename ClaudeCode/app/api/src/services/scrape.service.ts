import { AppError } from '../middleware/error-handler.middleware.js';

export interface ScrapeRequest {
  url: string;
}

export interface ScrapeResponse {
  title: string;
  description: string;
  ingredients: { name: string; amount: string; unit: string }[];
  ingredientGroups?: { groupLabel: string; ingredients: { name: string; amount: string; unit: string }[] }[];
  steps: { stepNumber: number; description: string }[];
  cookingTime?: number;
  servings?: number;
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const HTML_MAX_LENGTH = 100000;
const FETCH_TIMEOUT_MS = 10000;

async function fetchHtml(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)',
        'Accept': 'text/html',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(400, `Failed to fetch URL: HTTP ${response.status}`);
    }

    const html = await response.text();
    return html.slice(0, HTML_MAX_LENGTH);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if ((error as any)?.name === 'AbortError') {
      throw new AppError(408, 'URL fetch timed out');
    }
    throw new AppError(400, 'Failed to fetch URL');
  }
}

async function callClaudeApi(html: string): Promise<ScrapeResponse> {
  if (!ANTHROPIC_API_KEY) {
    throw new AppError(500, 'Anthropic API key is not configured');
  }

  const systemPrompt = `You are a recipe extraction assistant. Extract recipe information from the provided HTML content and return it as JSON. Return ONLY valid JSON with no additional text.`;

  const userPrompt = `Extract the recipe from this HTML and return JSON in this exact format:
{
  "title": "recipe title",
  "description": "brief description of the dish",
  "ingredientGroups": [{"groupLabel": "group name or empty string", "ingredients": [{"name": "ingredient name", "amount": "quantity", "unit": ""}]}],
  "steps": [{"stepNumber": 1, "description": "step description"}],
  "cookingTime": null,
  "servings": null
}

Rules:
- title: the recipe name
- description: a brief summary of the dish (1-2 sentences)
- ingredientGroups: group ingredients by their section headers (e.g. "メイン用", "ソース用", "A", "B"). If the recipe has no ingredient groups, use a single group with empty string as groupLabel. Each ingredient has name, amount (full amount string), and unit (leave as empty string)
- steps: numbered cooking instructions
- cookingTime: total cooking time in minutes (number or null if not found)
- servings: number of servings (number or null if not found)
- All text must be in the original language of the recipe
- Return ONLY the JSON object, no markdown or extra text

HTML:
${html}`;

  const MAX_RETRIES = 2;

  try {
    let response: Response | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (response.ok) break;

      const errorText = await response.text();
      console.error(`Claude API error (attempt ${attempt + 1}):`, errorText);

      // Retry on overloaded or rate limit errors
      if (response.status === 529 || response.status === 429) {
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
          continue;
        }
        throw new AppError(503, 'AIサービスが混雑しています。しばらく待ってから再度お試しください。');
      }

      throw new AppError(500, 'Failed to call Claude API');
    }

    if (!response || !response.ok) {
      throw new AppError(500, 'Failed to call Claude API');
    }

    const result = await response.json() as any;
    const content = result.content?.[0]?.text;

    if (!content) {
      throw new AppError(500, 'Empty response from Claude API');
    }

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr) as ScrapeResponse;

    // Normalize ingredientGroups
    if (parsed.ingredientGroups && parsed.ingredientGroups.length > 0) {
      // Flatten to ingredients for backward compatibility
      parsed.ingredients = parsed.ingredientGroups.flatMap(g => g.ingredients);
    } else if (parsed.ingredients && parsed.ingredients.length > 0) {
      // Convert flat ingredients to a single group
      parsed.ingredientGroups = [{ groupLabel: '', ingredients: parsed.ingredients }];
    }

    // Validate required fields
    if (!parsed.title || (!parsed.ingredients?.length && !parsed.ingredientGroups?.length) || !parsed.steps) {
      throw new AppError(500, 'Failed to extract recipe from page');
    }

    // Ensure steps have stepNumber
    parsed.steps = parsed.steps.map((step, index) => ({
      stepNumber: step.stepNumber || index + 1,
      description: step.description,
    }));

    // Clean up nulls
    if (parsed.cookingTime === null || parsed.cookingTime === undefined) {
      delete parsed.cookingTime;
    }
    if (parsed.servings === null || parsed.servings === undefined) {
      delete parsed.servings;
    }

    return parsed;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof SyntaxError) {
      throw new AppError(500, 'Failed to parse recipe data from AI response');
    }
    console.error('Error calling Claude API:', error);
    throw new AppError(500, 'Failed to extract recipe');
  }
}

export async function scrapeRecipe(request: ScrapeRequest): Promise<ScrapeResponse> {
  if (!request.url) {
    throw new AppError(400, 'URL is required');
  }

  // Basic URL validation
  try {
    const parsed = new URL(request.url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new AppError(400, 'URL must use HTTP or HTTPS');
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, 'Invalid URL format');
  }

  const html = await fetchHtml(request.url);
  return await callClaudeApi(html);
}
