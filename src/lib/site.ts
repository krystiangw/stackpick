import type { Metadata } from 'next'

/**
 * Where this site answers, in one place. Two kinds of default were scattered across the code and
 * nobody could tell which was which: metadata and sitemaps fall back to localhost, because in
 * development that is the truth, while anything a stranger reads has to fall back to production.
 * A user-agent that introduces itself as localhost tells a vendor nothing, and a documentation
 * page that links to localhost is broken for everyone but its author.
 *
 * This is the second kind. The fallback is the real domain, bought 2026-08-12; the dyno also
 * sets `STACKPICK_BASE_URL`, so a change there moves every published address without a deploy.
 */
export const SITE_URL = process.env.STACKPICK_BASE_URL ?? 'https://letagentsin.com'

/**
 * A page's title and description, once, used for the tab, the search snippet and the social card
 * alike.
 *
 * Fifteen static pages set `title` and `description` but never touched `openGraph`, so Next fell
 * back to the root layout's fixed values for all of them: every link shared in Slack or LinkedIn
 * showed the home page's description, whatever the actual page said (found 2026-09-11, alongside
 * the same gap on the per-category and per-vendor pages, fixed there by hand since their copy is
 * computed rather than literal). This is the one place that mistake can no longer happen.
 */
export function pageMetadata({
  title,
  description,
  path,
  robots,
}: {
  title: string
  description: string
  path: string
  robots?: Metadata['robots']
}): Metadata {
  const url = `${SITE_URL}${path}`
  return {
    title,
    description,
    alternates: { canonical: url },
    // Next replaces the layout's openGraph object wholesale rather than merging into it, so any
    // page that sets its own openGraph without these two loses the layout's og:site_name and
    // og:type entirely (found in codex review 2026-09-11, alongside the missing description
    // this helper exists to fix).
    openGraph: { title, description, url, siteName: 'Let Agents In', type: 'website' },
    ...(robots ? { robots } : {}),
  }
}
