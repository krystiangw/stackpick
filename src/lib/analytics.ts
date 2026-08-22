'use client'

import posthog from 'posthog-js'

export type AnalyticsEvent =
  | 'scan_started'
  | 'scan_completed'
  | 'report_viewed'
  | 'email_submitted'

/** Analytics must remain optional: a missing or blocked tracker may never affect the product. */
export function captureAnalytics(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return
  posthog.capture(event, properties)
}
