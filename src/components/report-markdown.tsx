/**
 * The delivered report, rendered in the portal from the markdown the generator wrote.
 *
 * Not a markdown parser. It renders exactly the constructs `scripts/client-report.mts` emits, and
 * `rules.mts` fails the build if that script ever emits one this does not know, which is the only
 * reason a renderer this small is honest: the input is ours and the guard proves it.
 *
 * Two versions of one report is the failure mode this avoids. The buyer's document and the page
 * they read it on are the same text, so a sentence cannot be softened on the way to the screen.
 */
import type { ReactNode } from 'react'

/** Bold, italic and links, the only inline markup the report uses. */
function inline(text: string, key: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s)]+)/g
  let at = 0
  let match: RegExpExecArray | null
  let index = 0
  while ((match = pattern.exec(text))) {
    if (match.index > at) parts.push(text.slice(at, match.index))
    index += 1
    if (match[1]) parts.push(<strong key={`${key}-b${index}`} className="font-semibold text-ink">{match[1]}</strong>)
    else if (match[2]) parts.push(<em key={`${key}-i${index}`} className="italic text-ink">{match[2]}</em>)
    else if (match[3]) parts.push(<a key={`${key}-a${index}`} href={match[4]} className="text-brass underline underline-offset-4">{match[3]}</a>)
    else parts.push(<a key={`${key}-u${index}`} href={match[5]} className="break-all text-brass underline underline-offset-4">{match[5]}</a>)
    at = match.index + match[0].length
  }
  if (at < text.length) parts.push(text.slice(at))
  return parts
}

// The divider comes through as `|---|---|`, with no space after the pipe, so a rule that wanted
// `"| "` ended the table after its header and rendered every score row as a table of its own.
const isTableRow = (line: string) => line.startsWith('|') && line.trimEnd().endsWith('|')
const isDivider = (line: string) => /^\|[\s|:-]+\|$/.test(line)
const cellsOf = (line: string) => line.slice(1, line.endsWith('|') ? -1 : undefined).split('|').map((cell) => cell.trim())

export function ReportMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')
  const blocks: ReactNode[] = []
  let at = 0
  while (at < lines.length) {
    const line = lines[at]
    const key = `line-${at}`
    if (line.trim() === '') {
      at += 1
      continue
    }
    if (line.startsWith('# ')) {
      blocks.push(<h1 key={key} className="mt-2 max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-tight">{inline(line.slice(2), key)}</h1>)
      at += 1
    } else if (line.startsWith('## ')) {
      blocks.push(<h2 key={key} className="mt-12 border-t border-rule pt-8 text-xl font-semibold tracking-tight">{inline(line.slice(3), key)}</h2>)
      at += 1
    } else if (line.startsWith('### ')) {
      blocks.push(<h3 key={key} className="mt-8 text-lg font-semibold tracking-tight">{inline(line.slice(4), key)}</h3>)
      at += 1
    } else if (line.startsWith('> ')) {
      const quoted: string[] = []
      while (at < lines.length && lines[at].startsWith('> ')) {
        quoted.push(lines[at].slice(2))
        at += 1
      }
      blocks.push(
        <blockquote key={key} className="mt-4 max-w-2xl border-l-2 border-brass pl-4 leading-relaxed text-ink-soft">
          {inline(quoted.join(' '), key)}
        </blockquote>,
      )
    } else if (isTableRow(line)) {
      const rows: string[][] = []
      while (at < lines.length && isTableRow(lines[at])) {
        if (!isDivider(lines[at])) rows.push(cellsOf(lines[at]))
        at += 1
      }
      const [head, ...body] = rows
      blocks.push(
        <div key={key} className="mt-4 max-w-2xl overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>{head?.map((cell, index) => <th key={index} className="border-b border-rule pb-2 text-left font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">{cell}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => <td key={index} className="border-b border-rule py-2 pr-4 align-top leading-relaxed">{inline(cell, `${key}-${rowIndex}-${index}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
    } else if (line.startsWith('- ') || /^\d+\. /.test(line)) {
      const ordered = !line.startsWith('- ')
      const items: string[] = []
      while (at < lines.length && (lines[at].startsWith('- ') || /^\d+\. /.test(lines[at]))) {
        items.push(lines[at].replace(/^(- |\d+\. )/, ''))
        at += 1
      }
      const className = 'mt-4 max-w-2xl space-y-2 pl-5 leading-relaxed text-ink-soft'
      blocks.push(
        ordered ? (
          <ol key={key} className={`${className} list-decimal`}>{items.map((item, index) => <li key={index}>{inline(item, `${key}-${index}`)}</li>)}</ol>
        ) : (
          <ul key={key} className={`${className} list-disc`}>{items.map((item, index) => <li key={index}>{inline(item, `${key}-${index}`)}</li>)}</ul>
        ),
      )
    } else {
      blocks.push(<p key={key} className="mt-4 max-w-2xl leading-relaxed text-ink-soft">{inline(line, key)}</p>)
      at += 1
    }
  }
  return <article>{blocks}</article>
}
