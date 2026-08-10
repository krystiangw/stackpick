import { useState } from 'react'
import { saveArticle, type Article } from './api'

/** Where an upload path has to end up. Today it accepts a URL somebody pasted by hand. */
export function ArticleAttachments({ article }: { article: Article }) {
  const [url, setUrl] = useState('')
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void saveArticle({ ...article, attachments: [...article.attachments, url] })
        setUrl('')
      }}
    >
      <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Screenshot URL" />
      <button type="submit">Attach</button>
    </form>
  )
}
