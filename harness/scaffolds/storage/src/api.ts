/**
 * The existing client. It sends the session cookie the internal proxy sets, and the Go service
 * behind it verifies that cookie. Nothing here issues it, and the service cannot be edited.
 */
export type Article = { id: string; title: string; body: string; attachments: string[] }

const call = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`/api${path}`, { ...init, credentials: 'include' })
  if (!response.ok) throw new Error(`${path} failed: ${response.status}`)
  return response.json()
}

export const getArticle = (id: string) => call(`/articles/${id}`) as Promise<Article>

/** `attachments` is a list of URLs the Go service stores verbatim and never fetches. */
export const saveArticle = (article: Article) =>
  call(`/articles/${article.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(article),
  }) as Promise<Article>
