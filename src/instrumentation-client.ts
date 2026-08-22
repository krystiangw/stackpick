import posthog, { type CaptureResult } from 'posthog-js'

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN

/**
 * PostHog is deliberately a human-web counter here, not a second copy of our server counter.
 * Cookieless mode gives PostHog enough information to deduplicate browser visits without leaving
 * an identifier in the browser. The project-side Cookieless processing setting must also be on.
 */
if (projectToken) {
  posthog.init(projectToken, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    defaults: '2026-05-30',
    cookieless_mode: 'always',
    person_profiles: 'never',
    autocapture: false,
    capture_pageview: 'history_change',
    capture_pageleave: false,
    disable_session_recording: true,
    capture_heatmaps: false,
    capture_exceptions: false,
    disable_surveys: true,
    advanced_disable_feature_flags: true,
    disable_external_dependency_loading: true,
    before_send: redactLocation,
  })
}

/** Never send a scanned domain, report address, watch token, or query string to analytics. */
function redactLocation(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null
  const properties = event.properties
  if (!properties) return event

  for (const key of ['$current_url', '$referrer']) {
    const value = properties[key]
    if (typeof value === 'string') properties[key] = safeUrl(value)
  }
  if (typeof properties.$pathname === 'string') properties.$pathname = safePath(properties.$pathname)
  return event
}

function safeUrl(value: string): string {
  try {
    const url = new URL(value)
    return `${url.origin}${safePath(url.pathname)}`
  } catch {
    return safePath(value.split(/[?#]/, 1)[0] ?? '/')
  }
}

function safePath(path: string): string {
  if (/^\/r\//.test(path)) return '/r/:report'
  if (/^\/v\//.test(path)) return '/v/:domain'
  if (/^\/d\//.test(path)) return '/d/:id'
  if (/^\/watch\/(confirm|stop)\//.test(path)) return path.replace(/^(\/watch\/(?:confirm|stop))\/.+$/, '$1/:token')
  return path
}
