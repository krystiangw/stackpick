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
