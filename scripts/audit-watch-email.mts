/** Render only: never sends mail or changes a subscription. */
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { changeEmail } from '../src/lib/watch-email'
import type { Watch, WatchChange } from '../src/lib/watch'
import type { Report } from '../src/lib/store'
const watch = { domain: 'vercel.com', id: 'preview-not-a-subscription', lastTotal: 11, lastMeasurable: 16 } as Watch
const report = { id: 'preview-not-a-report', scorecard: { total: 12, measurable: 16, max: 17, checks: [] } } as unknown as Report
const change: WatchChange = { checkId: 'agent_entry_point', label: 'Agent entry point', from: 'fail', to: 'partial', worse: false,
  detail: 'Found https://vercel.com/agents.md, but it states a policy rather than a procedure: nothing in it names a credential, an endpoint or a way to get an account.' }
const message = changeEmail(watch, report, [change], false, '2026-08-31T09:00:00Z')
assert.equal(message.subject, 'vercel.com: agent information found, setup steps missing')
for (const body of [message.text, message.html]) {
  assert.ok(body.includes('https://vercel.com/agents.md'))
  assert.ok(body.includes('12/16')); assert.ok(body.includes('11/16')); assert.ok(body.includes('2026-08-31'))
  assert.ok(body.indexOf('setup steps missing') < body.indexOf('12/16'))
  assert.ok(body.includes('two scans')); assert.ok(body.includes('seen only once'))
  assert.ok(body.includes('/r/preview-not-a-report')); assert.ok(body.includes('/watch/stop/preview-not-a-subscription'))
  assert.ok(body.includes('does not establish whether an agent can complete an integration'))
}
assert.ok(!message.text.includes('fail to partial'))
assert.throws(() => changeEmail(watch, report, []), /at least one/)
const unreadable = changeEmail(watch, report, [{ ...change, from: 'pass', to: 'unmeasured', detail: 'Could not read the host' }])
for (const body of [unreadable.text, unreadable.html]) {
  assert.ok(body.includes('They do not count against your score'))
  assert.ok(!/improved|gained|setup steps missing/i.test(body))
}
const rescored = changeEmail(watch, report, [change], true)
for (const body of [rescored.text, rescored.html]) assert.ok(body.includes('because we tightened a rule'))
assert.ok(!message.text.includes('recomputed'))
const injected = changeEmail({...watch, domain: '<img src=x onerror=alert(1)>\nBad'}, report, [{...change, detail: '<script>alert(1)</script>'}])
assert.ok(!injected.subject.includes('\n')); assert.ok(!injected.html.includes('<script>')); assert.ok(!injected.html.includes('<img'))
assert.ok(injected.html.includes('&lt;script&gt;'))
const many = Array.from({length:8},(_,i)=>({...change,checkId:`fixture-${i}`,label:`Check ${i}`,detail:`Evidence ${i}`}))
const digest = changeEmail(watch,report,many)
for(const body of [digest.text,digest.html]) {
  assert.ok(body.includes('5 more confirmed changes'))
  for(let i=0;i<8;i++)assert.ok(body.includes(`Check ${i}`))
  assert.ok(!body.includes('Evidence 3'))
}
const cron=readFileSync('src/app/api/cron/watch/route.ts','utf8')
assert.ok(cron.includes('const { subject, text, html } = changeEmail('))
assert.ok(cron.includes('sendEmail(watch.email, subject, text, html)'))
if(process.argv.includes('--preview')) {
  const dir='data/watch-email-2026-09-08';mkdirSync(dir,{recursive:true})
  for(const [name,mail] of Object.entries({vercel:message,unmeasured:unreadable,rescored,multiple:digest})) {
    writeFileSync(`${dir}/${name}.html`,mail.html);writeFileSync(`${dir}/${name}.txt`,mail.text)
  }
}
console.log('PASS: HTML delivery wired; observation leads, evidence and dates preserved; unknown results and rescoring disclosed; HTML escaped; long digests shortened. No email sent.')
