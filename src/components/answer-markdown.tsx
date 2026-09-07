import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Model output stays untrusted. No raw HTML; Markdown's default URL safety stays enabled. */
export function AnswerMarkdown({ text }: { text: string }) {
  return (
    <div className="answer-prose">
      <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
        h1: ({ children }) => <h3>{children}</h3>,
        h2: ({ children }) => <h3>{children}</h3>,
        h3: ({ children }) => <h4>{children}</h4>,
        table: ({ children }) => <div className="answer-table" tabIndex={0} role="region" aria-label="Table in agent response"><table>{children}</table></div>,
        img: ({ alt }) => <span>{alt ? `[Image: ${alt}]` : '[Image omitted]'}</span>,
      }}>{text}</Markdown>
    </div>
  )
}
