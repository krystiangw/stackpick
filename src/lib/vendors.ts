/**
 * Who a piece of prose names, decided by string matching rather than by asking a model.
 *
 * A discovery run asks an agent which provider it would reach for and keeps the answer verbatim.
 * Turning that answer into "you were named in 4 of 5 runs" is the part that has to be
 * reproducible, so it is done here: a published list of names, a published rule, and a control in
 * scripts/rules.mts that can fail. A second model reading the first model's answer would be a
 * measurement nobody can check, and it is exactly what the number is supposed to be evidence
 * against.
 *
 * The hard case is vendors whose brand is also an ordinary word. "Modal", "Temporal", "Split",
 * "Resend" and "Plaid" all appear in sentences about their own categories with nothing to do with
 * the company. Those are matched but returned as `weak`, and a weak mention is quoted for a human
 * rather than counted: an undercount tells a customer they are invisible when they are not, and an
 * overcount tells them they are visible when they are not, and both are wrong in ways worth
 * keeping apart.
 */
export type MentionForm = 'domain' | 'name' | 'weak'

export type Mention = {
  domain: string
  form: MentionForm
  /** Character offset of the first hit, which is what "named first" is read from. */
  at: number
  matched: string
  sentence: string
}

/**
 * Only where the brand is not the first label of the domain, or where that label is unusable.
 * An empty array means the domain string is the only safe evidence: `name.com` and `cal.com`
 * cannot be matched on "name" and "Cal" without counting half the English language.
 */
const ALIASES: Record<string, string[]> = {
  'api.video': [],
  'cal.com': [],
  'name.com': [],
  'here.com': ['HERE Technologies'],
  'tiny.cloud': ['TinyMCE'],
  'njal.la': ['Njalla'],
  'postmarkapp.com': ['Postmark'],
  'usefathom.com': ['Fathom'],
  'useanvil.com': ['Anvil'],
  'getunleash.io': ['Unleash'],
  'trychroma.com': ['Chroma'],
  'tigrisdata.com': ['Tigris'],
  'quilljs.com': ['Quill'],
  'editorjs.io': ['Editor.js', 'EditorJS'],
  'slatejs.org': ['Slate'],
  'elastic.co': ['Elasticsearch', 'Elastic'],
  'oramasearch.com': ['Orama'],
  'lemonsqueezy.com': ['Lemon Squeezy', 'LemonSqueezy'],
  'betterstack.com': ['Better Stack', 'BetterStack'],
  'newrelic.com': ['New Relic', 'NewRelic'],
  'datadoghq.com': ['Datadog'],
  'cockroachlabs.com': ['CockroachDB', 'Cockroach Labs'],
  'dropboxsign.com': ['Dropbox Sign'],
  'medusajs.com': ['Medusa'],
  'payloadcms.com': ['Payload CMS', 'Payload'],
  'together.ai': ['Together AI', 'TogetherAI', 'Together'],
  'trigger.dev': ['Trigger.dev', 'Trigger'],
  'daily.co': ['Daily.co', 'Daily'],
  'commercetools.com': ['commercetools'],
}

/**
 * Brand names that are also ordinary words. Matched only when capitalised, and always returned as
 * `weak`. Lowercase, because the check is on the name rather than on the text.
 */
const ORDINARY_WORDS = new Set([
  'amplitude',
  'anvil',
  'agora',
  'axiom',
  'bird',
  'bunny',
  'clerk',
  'courier',
  'daily',
  'elastic',
  'fireworks',
  'hatchet',
  'here',
  'highlight',
  'honeycomb',
  'hover',
  'june',
  'knock',
  'lexical',
  'loops',
  'modal',
  'neon',
  'paddle',
  'payload',
  'phrase',
  'plaid',
  'plausible',
  'polar',
  'radar',
  'replicate',
  'resend',
  'restate',
  'sanity',
  'slate',
  'split',
  'swell',
  'temporal',
  'together',
  'trigger',
  'windmill',
])

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The first label, which is the brand for most of the corpus and unusable for the rest. */
const labelOf = (domain: string) => domain.split('.')[0]

export function namesFor(domain: string): string[] {
  const aliases = ALIASES[domain]
  if (aliases) return aliases
  const label = labelOf(domain)
  return label.length >= 3 ? [label] : []
}

/** The sentence a hit sits in, so a weak mention can be read rather than argued about. */
function sentenceAround(text: string, at: number): string {
  const before = text.lastIndexOf('\n', at)
  const start = Math.max(before + 1, text.slice(0, at).search(/[^.!?]*$/))
  const rest = text.slice(at)
  const end = at + (rest.search(/[.!?\n]/) + 1 || rest.length)
  return text.slice(Math.max(start, 0), end).trim().replace(/\s+/g, ' ')
}

function firstHit(text: string, pattern: RegExp): { at: number; matched: string } | null {
  const found = pattern.exec(text)
  return found ? { at: found.index, matched: found[0] } : null
}

/**
 * Every listed domain the text names, strongest evidence first. A domain that appears both as a
 * URL and as a bare brand is reported once, on the domain, because that is the form nothing else
 * can be confused with.
 */
export function mentionsIn(text: string, domains: readonly string[]): Mention[] {
  const found: Mention[] = []
  for (const domain of domains) {
    const asDomain = firstHit(text, new RegExp(`\\b${escape(domain)}\\b`, 'i'))
    if (asDomain) {
      found.push({ domain, form: 'domain', ...asDomain, sentence: sentenceAround(text, asDomain.at) })
      continue
    }
    let best: Mention | null = null
    for (const name of namesFor(domain)) {
      const ordinary = ORDINARY_WORDS.has(name.toLowerCase())
      const hit = firstHit(text, new RegExp(`\\b${escape(name)}\\b`, 'i'))
      // An ordinary word in lower case is the word, not the company. Capitalised it is ambiguous,
      // which is what `weak` means and why the sentence travels with it.
      if (!hit || (ordinary && !/^[A-Z]/.test(hit.matched))) continue
      const mention: Mention = {
        domain,
        form: ordinary ? 'weak' : 'name',
        ...hit,
        sentence: sentenceAround(text, hit.at),
      }
      // Certain evidence wins over ambiguous evidence anywhere in the answer; between two of the
      // same kind, the earlier one, because position is what "named first" is read from.
      const better = !best || (mention.form === 'name' && best.form === 'weak') || (mention.form === best.form && mention.at < best.at)
      if (better) best = mention
    }
    if (best) found.push(best)
  }
  return found.sort((a, b) => a.at - b.at)
}

/** What a run counts as: named for certain, or named only through a word that is also English. */
export const certain = (mentions: Mention[]) => mentions.filter((mention) => mention.form !== 'weak')
