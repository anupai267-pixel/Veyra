// ==============================================================================
// VEYRA OPENAI INTEGRATION SERVICE
// Server-side only: Uses official OpenAI API SDK with one configured model.
// Never exposes API keys or executes unauthorized actions.
// ==============================================================================

import OpenAI from 'openai';

// Read server environment variables
const apiKey = process.env.OPENAI_API_KEY;
const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let openaiClient = null;

// Initialize official OpenAI client if key is present and not default placeholder
if (apiKey && apiKey.trim() !== '' && apiKey !== 'your_openai_api_key_here') {
  try {
    openaiClient = new OpenAI({ apiKey: apiKey.trim() });
  } catch (err) {
    console.warn('[OpenAI] Failed to initialize client:', err.message);
  }
}

/**
 * Checks whether the OpenAI service is configured.
 */
export const isOpenAIConfigured = () => {
  return Boolean(openaiClient && apiKey && apiKey !== 'your_openai_api_key_here');
};

/**
 * Generates a professional product description based strictly on seller-supplied details.
 * Never fabricates specs, condition, provenance, or warranties.
 *
 * @param {Object} details
 * @returns {Promise<{ success: boolean, description?: string, model?: string, error?: string }>}
 */
export async function generateProductDescription(details = {}) {
  if (!isOpenAIConfigured()) {
    return {
      success: false,
      error: 'OpenAI API key is not configured on the server. Please set OPENAI_API_KEY in your server environment.'
    };
  }

  const {
    name = '',
    category = '',
    brand = '',
    model = '',
    condition = '',
    age = '',
    features = '',
    specifications = '',
    accessories = '',
    defects = '',
    authenticity = '',
    materials = '',
    dimensions = '',
    provenance = ''
  } = details;

  if (!name.trim()) {
    return { success: false, error: 'Product name is required for AI description generation.' };
  }

  const userPrompt = `
Generate a concise, professional, and elegant auction catalogue description for this item:

- Product Name: ${name}
- Category: ${category || 'Artisan Collectible'}
${brand ? `- Brand/Maker: ${brand}` : ''}
${model ? `- Model: ${model}` : ''}
${condition ? `- Condition: ${condition}` : ''}
${age ? `- Age/Period: ${age}` : ''}
${materials ? `- Materials: ${materials}` : ''}
${dimensions ? `- Dimensions: ${dimensions}` : ''}
${features ? `- Key Features: ${features}` : ''}
${specifications ? `- Specifications: ${specifications}` : ''}
${accessories ? `- Included Accessories: ${accessories}` : ''}
${defects ? `- Known Defects/Wear: ${defects}` : ''}
${authenticity ? `- Authenticity Details: ${authenticity}` : ''}
${provenance ? `- Provenance: ${provenance}` : ''}

Strict Rules:
1. Write 2 to 3 concise, evocative, and grammatically impeccable paragraphs suitable for a luxury art & heritage auction house.
2. Rely ONLY on the information provided above. NEVER invent or assume specifications, provenance, certificates, age, materials, condition, or guarantees.
3. If defects or signs of wear are mentioned, describe them transparently and respectfully.
4. Output only the finished description text without markdown headings or chat preamble.
`.trim();

  try {
    const response = await openaiClient.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'You are an authoritative luxury art, vintage, and artisan auction cataloguer for VEYRA. You write elegant, concise, and truthful catalogue descriptions based strictly and exclusively on the user-provided facts.'
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.6,
      max_tokens: 450
    });

    const description = response.choices?.[0]?.message?.content?.trim();
    if (!description) {
      return { success: false, error: 'AI returned an empty response.' };
    }

    return {
      success: true,
      description,
      model: modelName
    };
  } catch (err) {
    console.error('[OpenAI Error - Description Generation]:', err);
    return {
      success: false,
      error: `OpenAI request failed: ${err.message || 'Service unavailable'}`
    };
  }
}

/**
 * Generates tactical bidding insights for the live auction floor.
 * Note: The AI model ONLY generates analytical commentary; it NEVER executes bids.
 *
 * @param {Object} auctionState
 * @returns {Promise<{ success: boolean, insights?: string, model?: string, error?: string }>}
 */
export async function generateBiddingInsights(auctionState = {}) {
  if (!isOpenAIConfigured()) {
    return {
      success: false,
      error: 'OpenAI API key is not configured on the server.'
    };
  }

  const {
    name = 'Curated Lot',
    currentBid = 0,
    startingBid = 0,
    minIncrement = 50,
    bidCount = 0,
    remainingSeconds = 0,
    recentBids = []
  } = auctionState;

  const minNextBid = currentBid + minIncrement;
  const recentBidsSummary = recentBids.slice(0, 5).map(b => `₹${Number(b.amount).toLocaleString('en-IN')} (${b.bidType || 'floor'} by ${b.bidder})`).join(', ');

  const prompt = `
Lot: "${name}"
Current Highest Bid: ₹${Number(currentBid).toLocaleString('en-IN')}
Starting Bid: ₹${Number(startingBid).toLocaleString('en-IN')}
Minimum Bid Increment: ₹${Number(minIncrement).toLocaleString('en-IN')}
Next Valid Minimum Bid: ₹${Number(minNextBid).toLocaleString('en-IN')}
Total Bids Placed: ${bidCount}
Seconds Remaining: ${remainingSeconds}
Recent Bids: ${recentBidsSummary || 'None yet'}

Provide a 2-sentence sharp, objective auction-floor summary:
1. Characterize the bidding momentum (e.g. steady floor competition, rapid escalation, or quiet lot).
2. State the exact next valid bid required (₹${Number(minNextBid).toLocaleString('en-IN')}) and the seller minimum increment.
Do not provide financial advice. Output only the 2 sentences.
`.trim();

  try {
    const response = await openaiClient.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'You are an objective auction floor analyst at VEYRA. Provide precise, factual floor insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 150
    });

    const insights = response.choices?.[0]?.message?.content?.trim();
    return {
      success: true,
      insights,
      model: modelName
    };
  } catch (err) {
    return {
      success: false,
      error: `OpenAI insight generation failed: ${err.message}`
    };
  }
}
