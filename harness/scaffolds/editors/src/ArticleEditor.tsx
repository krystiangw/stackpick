import { useState } from 'react'
import { saveArticle, type Article } from './api'

/** The component a run is asked to replace with a real editor. */
export function ArticleEditor({ article }: { article: Article }) {
  const [body, setBody] = useState(article.body)
  return (
    <form onSubmit={(event) => { event.preventDefault(); void saveArticle({ ...article, body }) }}>
      <textarea value={body} onChange={(event) => setBody(event.target.value)} />
      <button type="submit">Save</button>
    </form>
  )
}
