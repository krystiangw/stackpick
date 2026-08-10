/** The API the editor has to save through. `body` is documented as HTML, which is the whole trap. */
export type Article = { id: string; title: string; body: string }

export async function saveArticle(article: Article): Promise<Article> {
  const response = await fetch(`/api/articles/${article.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(article),
  })
  if (!response.ok) throw new Error(`save failed: ${response.status}`)
  return (await response.json()) as Article
}
