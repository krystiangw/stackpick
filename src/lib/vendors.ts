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
  'here.com': ['HERE Technologies', 'HERE'],
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

/**
 * A full stop ends a sentence only when whitespace or the end of the text follows it. The dot in
 * vercel.com does not, and the hit we quote around is very often inside exactly such a token: the
 * $49 report for vercel.com published five of its six codex quotes as "[Vercel limits](https://vercel."
 * because the sentence was cut at the dot in the domain the mention was found on. A quote that
 * stops mid-address carries nothing, and it is the half of that report a buyer reads first.
 */
// The closing markup a sentence may end inside is part of the ending, not a reason to run on:
// answers write `**Vercel is the pick.** Render is second` and `("it is the pick.") Render ...`,
// and a boundary that insisted on whitespace immediately after the full stop would glue a
// competitor's sentence onto the quote we send the vendor.
const sentenceBreak = () => /[.!?][)\]}"'”’*_`]*(?=\s|$)|\n/g

/** The sentence a hit sits in, so a weak mention can be read rather than argued about. */
function sentenceAround(text: string, at: number): string {
  const opened = [...text.slice(0, at).matchAll(sentenceBreak())].pop()
  const start = opened ? opened.index + opened[0].length : 0
  const rest = text.slice(at)
  const closed = sentenceBreak().exec(rest)
  const end = closed ? at + closed.index + closed[0].length : text.length
  return text.slice(start, end).trim().replace(/\s+/g, ' ')
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
      // An alias written in capitals is matched in capitals. here.com styles itself HERE, and the
      // only safe alias for it was "HERE Technologies", so every answer calling it HERE - which is
      // all five in the maps cell - counted as never naming them. Case is the disambiguation here:
      // "here" is the English word, "HERE" is the company.
      const shouty = name.length > 2 && name === name.toUpperCase() && name !== name.toLowerCase()
      const hit = firstHit(text, new RegExp(`\\b${escape(name)}\\b`, shouty ? '' : 'i'))
      // An ordinary word in lower case is the word, not the company. Capitalised it is ambiguous,
      // which is what `weak` means and why the sentence travels with it.
      if (!hit || (ordinary && !/^[A-Z]/.test(hit.matched))) continue
      const mention: Mention = {
        domain,
        form: ordinary && !styledAsABrand(text, name) ? 'weak' : 'name',
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
  return promoted(found).sort((a, b) => a.at - b.at)
}

/**
 * Typography settles what a neighbour cannot.
 *
 * The category pages publish "N of M vendors were never named once", and an audit of that sentence
 * on 2026-08-17 found three companies it was false about: an answer recommending `**Sanity**` in
 * bold, one calling `HERE` a real competitor in capitals, and one opening with "Neon would be my
 * choice" and saying Neon three times. Each was the only vendor in its sentence, so the rule that
 * promotes a weak mention beside a certain one could never reach them, and we published that an
 * agent had never mentioned a company it had just recommended.
 *
 * Three signals, each of which a writer uses for a product name and not for the English word:
 * emphasis or code or a link label around it, capitals throughout, or the capitalised form used
 * more than once in the same answer. "the bunny hops" fails all three, which is the test.
 */
function styledAsABrand(text: string, name: string): boolean {
  const word = escape(name)
  if (new RegExp(`(?:\\*\\*|\`|\\[|_)${word}\\b`, 'i').test(text)) return true
  if (name.length > 2 && new RegExp(`\\b${word.toUpperCase()}\\b`).test(text) && name.toUpperCase() !== name.toLowerCase()) {
    if (new RegExp(`\\b${name.toUpperCase()}\\b`).test(text)) return true
  }
  const capitalised = text.match(new RegExp(`\\b${name[0].toUpperCase()}${escape(name.slice(1))}\\b`, 'g')) ?? []
  return capitalised.length > 1
}

/**
 * An ordinary word standing next to a vendor nobody can mistake is being used as a brand.
 *
 * Measured 2026-08-16 on the payments cell: Paddle was recommended in five runs out of five, every
 * time in a sentence that also named Lemon Squeezy or Stripe, and every time the ambiguity rule
 * threw it out. "Merchant of Record (Paddle, Lemon Squeezy)" is not a sentence about a boat. The
 * capitalisation requirement still has to be met first, so "split the traffic in LaunchDarkly"
 * stays out, and a capitalised word alone in its sentence stays weak.
 */
function promoted(found: Mention[]): Mention[] {
  const sure = found.filter((mention) => mention.form !== 'weak')
  const weak = found.filter((mention) => mention.form === 'weak')
  if (sure.length === 0 && weak.length < 2) return found
  return found.map((mention) => {
    if (mention.form !== 'weak') return mention
    const nextToCertain = sure.some((other) => other.domain !== mention.domain && mention.sentence.includes(other.matched))
    // Two ordinary words from the SAME category, capitalised, in one sentence, is a list of
    // vendors. Measured on the llm-infrastructure cell: "Self-hosted modele / GPU (Ollama, vLLM,
    // Replicate, Modal)" names two of ours and neither had a certain neighbour, because Ollama and
    // vLLM are not in that category's list. English does not put two capitalised category brands
    // in one sentence by accident.
    const nextToAnother = weak.some((other) => other.domain !== mention.domain && mention.sentence.includes(other.matched))
    return nextToCertain || nextToAnother ? { ...mention, form: 'name' } : mention
  })
}

/** What a run counts as: named for certain, or named only through a word that is also English. */
export const certain = (mentions: Mention[]) => mentions.filter((mention) => mention.form !== 'weak')

/**
 * The sentence a run wrote about one vendor, for the documents a customer receives.
 *
 * It lives here rather than in each script because both of them had written their own, and both
 * versions searched for the brand as a substring: name.com was quoted "nameservers", tiny.cloud
 * "scrutiny", deepl.com "deeply", every one of them a sentence about a competitor sent to a vendor
 * no run had named. A count and a quote printed in the same paragraph have to come from one
 * definition of being named, and this is that definition.
 *
 * The whole category is passed rather than the one domain, because the matcher resolves a name
 * against its neighbours: "HERE" is a vendor here and an ordinary word everywhere else.
 */
/**
 * Words a reader gets from a sentence, ignoring link syntax and addresses. A run that names a
 * vendor in a markdown table cell produces "[Vercel limits](https://vercel.com/docs/limits) |",
 * which is a correct quote of a true mention and tells a buyer nothing.
 */
export const wordsCarried = (sentence: string) =>
  (sentence
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    // A bare address is as empty as a linked one: "vercel.com |" is a table cell, and counting
    // "vercel" and "com" as two words a reader takes away is how it survived the first version.
    .replace(/\b[\w-]+(?:\.[\w-]+)+(?:\/\S*)?/g, ' ')
    .match(/[\p{L}][\p{L}'-]{2,}/gu) ?? []).length

/** Below this a quote is a link and a pipe, so another occurrence is worth looking for. */
const CARRIES_ENOUGH = 5

/**
 * Where a token stands in the text, under the rules the matcher uses to decide it is a company at
 * all. A capital letter is not enough for a word that is also English: "Split the traffic across
 * regions" opens a sentence and would otherwise be quoted to split.io as praise. The answer has to
 * style the word as a product somewhere, which is the test that separates `name` from `weak`, and
 * it is asked of the whole answer rather than of one sentence on purpose: an answer that writes
 * `[Neon](url)` in a table and then "Neon would be my choice for branching" has established the
 * brand, and the second sentence is the one worth quoting.
 */
function occurrencesOf(text: string, token: string): number[] {
  const ordinary = ORDINARY_WORDS.has(token.toLowerCase())
  const asABrand = ordinary && styledAsABrand(text, token)
  const shouty = token.length > 2 && token === token.toUpperCase() && token !== token.toLowerCase()
  return [...text.matchAll(new RegExp(`\\b${escape(token)}\\b`, shouty ? 'g' : 'gi'))]
    .filter((hit) => !ordinary || (asABrand && /^[A-Z]/.test(hit[0])))
    .map((hit) => hit.index)
}

export const quotedAbout = (text: string, domain: string, inCategory: readonly string[]): string | null => {
  const mention = certain(mentionsIn(text, inCategory)).find((candidate) => candidate.domain === domain)
  if (!mention) return null
  // Every occurrence of every form they are known by, not the first hit. The first is what "named
  // first" is read from and must not move, but the sentence printed to a paying customer should be
  // one that says something: the vercel.com report quoted three of six codex runs as a bare link,
  // because their first mention sat in a table of links while the prose two paragraphs down
  // weighed the vendor. Certainty is already settled above; this only chooses what to print.
  const sentences = [...new Set([domain, ...namesFor(domain)].flatMap((token) => occurrencesOf(text, token)).sort((a, b) => a - b).map((at) => sentenceAround(text, at)))]
  const carrying = sentences.find((sentence) => wordsCarried(sentence) >= CARRIES_ENOUGH)
  const richest = sentences.reduce((best, sentence) => (wordsCarried(sentence) > wordsCarried(best) ? sentence : best), mention.sentence)
  const best = carrying ?? richest
  // A run can name a vendor only inside a table of links, and then there is no sentence to quote.
  // Saying nothing is the honest outcome: the count of runs that named them is read from the run's
  // own list and does not need a quote to stand, while "[Resend plans](url) |" printed under
  // "what the runs said about you" is a paragraph that says nothing and looks like a bug.
  return wordsCarried(best) === 0 ? null : best
}
