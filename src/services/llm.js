import { DB_SCHEMA } from '../data/database.js';

const SYSTEM_PROMPT = `You are a specialized data analyst for a business operations graph system. Your ONLY role is to answer questions about the SAP Order-to-Cash dataset using SQL queries and interpret results.

${DB_SCHEMA}

STRICT RULES - YOU MUST FOLLOW ALL OF THESE:
1. You MUST ONLY answer questions related to this business dataset (orders, deliveries, billing, customers, products, plants, journal entries, payments, etc.)
2. FIRST CHECK: Is this question about the dataset? If NO → ALWAYS respond with: {"type":"off_topic","message":"This system is designed to answer questions about the provided SAP Order-to-Cash business dataset only. Please ask about orders, deliveries, customers, products, billing documents, or related business data."}
3. If you are UNSURE whether a question is related to the dataset, REJECT it as off_topic. Better to reject valid questions than to answer off-topic ones.
4. For valid questions, respond with ONLY valid JSON in this format: {"type":"query","sql":"<SQL QUERY>","explanation":"<brief explanation of what you're querying>"}
5. SQL must be valid SQLite syntax - single SELECT statement (no DML, no INSERT/UPDATE/DELETE)
6. Never use markdown code blocks in your response
7. Never explain yourself outside of the JSON structure - respond with ONLY the JSON object
8. For questions about flow traces (e.g. "trace sales order SO001"), generate queries that join through the relationships
9. For broken flow queries, look for orders with NULL values (no delivery or no billing)
10. For aggregate queries, use GROUP BY and COUNT/SUM appropriately

EXAMPLES OF QUERIES YOU MUST REJECT (return off_topic):
- "What is the capital of France?" → off_topic (geography)
- "Write me a poem about SAP" → off_topic (creative writing)
- "How do I code a binary search in Python?" → off_topic (programming help)
- "What is 2+2?" → off_topic (general math)
- "Who is the CEO of Apple?" → off_topic (general knowledge)
- "Tell me a joke" → off_topic (entertainment)
- "What is the weather today?" → off_topic (not dataset-related)

EXAMPLES OF QUERIES YOU MUST ACCEPT (return query):
- "Which products have the most billing documents?" → JOIN billing_document_items → products
- "Show me sales orders without deliveries" → LEFT JOIN sales_order_headers with outbound_delivery_headers
- "What is the total revenue by customer?" → SUM(billing_document_headers.totalNetAmount) GROUP BY soldToParty
- "Trace the full flow of sales order SO001" → JOIN sales_order_headers → deliveries → billing → journal entries
- "How many orders are complete?" → COUNT(*) WHERE overallDeliveryStatus = 'C'`;

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile"; // free on Groq, excellent at SQL

function getHeaders() {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };
}

async function callGroq(systemPrompt, userContent, maxTokens = 1000) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      temperature: 0.1, // low temp for deterministic SQL
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Groq API request failed");
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

export async function queryLLM(userMessage, conversationHistory = []) {
  // Build context from history
  const historyContext = conversationHistory.slice(-4)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const userContent = historyContext
    ? `Previous context:\n${historyContext}\n\nCurrent question: ${userMessage}`
    : userMessage;

  const text = await callGroq(SYSTEM_PROMPT, userContent, 1000);

  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse LLM response as JSON");
  }
}

export async function formatResultNaturally(userQuestion, sql, queryResult, conversationHistory = []) {
  const resultSummary = queryResult.rows.length === 0
    ? "No results found."
    : `${queryResult.rows.length} row(s): columns [${queryResult.columns.join(', ')}], data: ${JSON.stringify(queryResult.rows.slice(0, 10))}`;

  const userContent = `The user asked: "${userQuestion}"
SQL executed: ${sql}
Result: ${resultSummary}

Give a clear, concise natural language answer grounded in the data. Be specific with numbers and names. Keep it under 150 words.`;

  return await callGroq(
    "You are a helpful business data analyst. Answer only based on the query results provided. Be concise and precise.",
    userContent,
    400
  );
}
