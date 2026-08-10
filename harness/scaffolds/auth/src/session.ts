/**
 * The whole of the app's identity today: a cookie an internal proxy sets, which the Go service
 * verifies. There is no login screen, no user record here, and no way to issue this cookie from
 * the frontend. Replacing it is the job.
 */
export type Session = { userId: string; email: string }

export async function currentSession(): Promise<Session | null> {
  const response = await fetch('/api/session', { credentials: 'include' })
  return response.ok ? ((await response.json()) as Session) : null
}
