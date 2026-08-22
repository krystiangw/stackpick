export const VISIBILITY_METHOD = 'visibility-beta-1'

export type VisibilityProvider = 'openai' | 'anthropic' | 'gemini' | 'perplexity'
export type VisibilityAnswer = {
  provider: VisibilityProvider
  model: string
  prompt: string
  valid: boolean
  mentioned: boolean
  position: number | null
  linked: boolean
  answer: string
  sources: string[]
  error?: string
}

export type VisibilityAudit = {
  method: typeof VISIBILITY_METHOD
  brand: string
  domain: string
  category: string
  runAt: string
  prompts: string[]
  answers: VisibilityAnswer[]
  summary: { attempted: number; valid: number; mentioned: number; linked: number; providers: number }
}

type Provider = { id: VisibilityProvider; model: string; ask: (prompt: string) => Promise<{ text: string; sources: string[] }> }
type Json = Record<string, unknown>

const urlsIn = (text: string) => [...new Set(text.match(/https?:\/\/[^\s)\]}>"']+/g) ?? [])]
const textBlocks = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Json
    if (typeof row.text === 'string') return [row.text]
    return textBlocks(row.content)
  })
}

async function post(url: string, headers: Record<string, string>, body: Json): Promise<Json> {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(22_000) })
  const json = await response.json().catch(() => ({})) as Json
  if (!response.ok) throw new Error(typeof (json.error as Json | undefined)?.message === 'string' ? String((json.error as Json).message) : `HTTP ${response.status}`)
  return json
}

function providers(): Provider[] {
  const all: Provider[] = []
  if (process.env.OPENAI_API_KEY) all.push({
    id: 'openai', model: process.env.OPENAI_VISIBILITY_MODEL || 'gpt-5.6-luna',
    ask: async (prompt) => {
      const data = await post('https://api.openai.com/v1/responses', { authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, { model: process.env.OPENAI_VISIBILITY_MODEL || 'gpt-5.6-luna', input: prompt, tools: [{ type: 'web_search' }], include: ['web_search_call.action.sources'], store: false, max_output_tokens: 900 })
      const text = typeof data.output_text === 'string' ? data.output_text : textBlocks(data.output).join('\n')
      return { text, sources: urlsIn(JSON.stringify(data.output ?? [])).concat(urlsIn(text)) }
    },
  })
  if (process.env.ANTHROPIC_API_KEY) all.push({
    id: 'anthropic', model: process.env.ANTHROPIC_VISIBILITY_MODEL || 'claude-sonnet-4-6',
    ask: async (prompt) => {
      const data = await post('https://api.anthropic.com/v1/messages', { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' }, { model: process.env.ANTHROPIC_VISIBILITY_MODEL || 'claude-sonnet-4-6', max_tokens: 900, messages: [{ role: 'user', content: prompt }], tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }] })
      const text = textBlocks(data.content).join('\n')
      return { text, sources: urlsIn(JSON.stringify(data.content ?? [])).concat(urlsIn(text)) }
    },
  })
  if (process.env.GEMINI_API_KEY) all.push({
    id: 'gemini', model: process.env.GEMINI_VISIBILITY_MODEL || 'gemini-3.6-flash',
    ask: async (prompt) => {
      const model = process.env.GEMINI_VISIBILITY_MODEL || 'gemini-3.6-flash'
      const data = await post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { 'x-goog-api-key': process.env.GEMINI_API_KEY! }, { contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }], generationConfig: { maxOutputTokens: 900 } })
      const candidates = Array.isArray(data.candidates) ? data.candidates as Json[] : []
      const text = candidates.flatMap((one) => textBlocks((one.content as Json | undefined)?.parts)).join('\n')
      return { text, sources: urlsIn(JSON.stringify(candidates)).concat(urlsIn(text)) }
    },
  })
  if (process.env.PERPLEXITY_API_KEY) all.push({
    id: 'perplexity', model: process.env.PERPLEXITY_VISIBILITY_MODEL || 'sonar',
    ask: async (prompt) => {
      const data = await post('https://api.perplexity.ai/chat/completions', { authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` }, { model: process.env.PERPLEXITY_VISIBILITY_MODEL || 'sonar', messages: [{ role: 'user', content: prompt }], max_tokens: 900 })
      const choices = Array.isArray(data.choices) ? data.choices as Json[] : []
      const text = choices.map((one) => (one.message as Json | undefined)?.content).filter((one): one is string => typeof one === 'string').join('\n')
      const citations = Array.isArray(data.citations) ? data.citations.filter((one): one is string => typeof one === 'string') : []
      return { text, sources: citations.concat(urlsIn(text)) }
    },
  })
  return all
}

export function visibilityPrompts(category: string): string[] {
  return [
    `What are the best ${category} products for a software team whose AI coding agent must discover and integrate the service without human help? Recommend up to five and cite sources.`,
    `Which ${category} providers are easiest for an unattended AI agent to sign up for, obtain credentials from, and integrate? Compare up to five and cite current sources.`,
    `I need a ${category} service with machine-readable documentation and a programmatic path from discovery to first API call. What should I shortlist? Cite sources.`,
  ]
}

function rank(text: string, brand: string, domain: string): number | null {
  const wanted = [brand, domain.replace(/^www\./, '')].map((one) => one.toLowerCase())
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const at = lines.findIndex((line) => wanted.some((one) => line.toLowerCase().includes(one)))
  return at < 0 ? null : at + 1
}

export function visibilityAnswer(input: {
  provider: VisibilityProvider
  model: string
  prompt: string
  brand: string
  domain: string
  answer: string
  sources?: string[]
  error?: string
}): VisibilityAnswer {
  if (input.error || !input.answer.trim()) {
    return { provider: input.provider, model: input.model, prompt: input.prompt, valid: false, mentioned: false, position: null, linked: false, answer: '', sources: [], error: input.error || 'The model returned no answer.' }
  }
  const answer = input.answer.trim()
  const sources = [...new Set(input.sources ?? urlsIn(answer))]
  const position = rank(answer, input.brand, input.domain)
  return { provider: input.provider, model: input.model, prompt: input.prompt, valid: true, mentioned: position !== null, position, linked: sources.some((url) => url.toLowerCase().includes(input.domain.toLowerCase())), answer, sources }
}

export async function runVisibilityAudit(input: { brand: string; domain: string; category: string }): Promise<VisibilityAudit> {
  const active = providers()
  if (active.length === 0) throw new Error('No visibility model API is configured.')
  const prompts = visibilityPrompts(input.category)
  const answers = await Promise.all(active.flatMap((provider) => prompts.map(async (prompt): Promise<VisibilityAnswer> => {
    try {
      const result = await provider.ask(prompt)
      const text = result.text.trim()
      if (!text) throw new Error('The model returned no answer.')
      const position = rank(text, input.brand, input.domain)
      const sources = [...new Set(result.sources)]
      return { provider: provider.id, model: provider.model, prompt, valid: true, mentioned: position !== null, position, linked: sources.some((url) => url.toLowerCase().includes(input.domain.toLowerCase())), answer: text, sources }
    } catch (error) {
      return { provider: provider.id, model: provider.model, prompt, valid: false, mentioned: false, position: null, linked: false, answer: '', sources: [], error: error instanceof Error ? error.message : 'Unknown provider error' }
    }
  })))
  const valid = answers.filter((one) => one.valid)
  return { method: VISIBILITY_METHOD, ...input, runAt: new Date().toISOString(), prompts, answers, summary: { attempted: answers.length, valid: valid.length, mentioned: valid.filter((one) => one.mentioned).length, linked: valid.filter((one) => one.linked).length, providers: active.length } }
}

export function configuredVisibilityProviders(): VisibilityProvider[] { return providers().map((one) => one.id) }
