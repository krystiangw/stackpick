import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AnswerMarkdown } from '../src/components/answer-markdown'

const render = (text: string) => renderToStaticMarkup(createElement(AnswerMarkdown, { text }))
const hostile = render('[bad](javascript:alert%281%29)\n\n<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n![tracking](https://example.com/pixel)')
assert.doesNotMatch(hostile, /<script|<img|onerror=|href="javascript:/i)
const useful = render('## Comparison\n\n| Provider | Cost |\n| --- | --- |\n| **Example** | $10 |\n\n[Source](https://example.com/docs)\n\n```js\nconst key = "<secret>"\n```')
assert.match(useful, /<table>/)
assert.match(useful, /<strong>Example<\/strong>/)
assert.match(useful, /href="https:\/\/example.com\/docs"/)
assert.match(useful, /&lt;secret&gt;/)
assert.doesNotMatch(useful, /<h1|<h2/)
console.log('PASS: readable tables, links and code; untrusted HTML, script URLs and remote images stay inert.')
