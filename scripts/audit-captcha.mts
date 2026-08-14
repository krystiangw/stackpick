/**
 * Sixteenth adversarial pass: 28 rows say a CAPTCHA vendor appears in the signup page's HTML.
 *
 * The claim is unusually narrow and therefore unusually cheap to refute: a named string is either
 * in the bytes the server sent or it is not. It is also one of the two numbers on the landing page,
 * so a wrong one is wrong in public.
 *
 * The control is the point, as always: the same probe runs against rows we credit with a clean
 * signup, and it has to come back empty for them. Without that, "we found the string everywhere"
 * would mean the pattern is too loose rather than that the vendors use CAPTCHAs.
 *
 * Reads `domain<TAB>url` on stdin. GET only, nothing is submitted.
 *
 *   npx tsx scripts/audit-captcha.mts --accused < accused.tsv
 */
const VENDORS: [string, RegExp][] = [
  ['recaptcha', /recaptcha|gstatic\.com\/recaptcha|google\.com\/recaptcha/i],
  ['hcaptcha', /hcaptcha/i],
  ['turnstile', /turnstile|challenges\.cloudflare\.com/i],
]

async function captchasOn(url: string): Promise<{ found: string[]; status: number | string; bytes: number }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // The same agent the scanner uses, because a page served differently to a browser is a
        // different measurement and this pass is about reproducing ours, not somebody else's.
        'user-agent': 'LetAgentsIn/1.0 (+https://letagentsin.com/methodology)',
        accept: 'text/html,application/xhtml+xml',
      },
    })
    const body = await response.text()
    return {
      found: VENDORS.filter(([, pattern]) => pattern.test(body)).map(([name]) => name),
      status: response.status,
      bytes: body.length,
    }
  } catch (error) {
    return { found: [], status: (error as Error).name === 'AbortError' ? 'timeout' : 'blad sieci', bytes: 0 }
  } finally {
    clearTimeout(timer)
  }
}

const control = process.argv[2] === '--control'
const lines = (await new Response(process.stdin as never).text()).trim().split('\n').filter(Boolean)

let agree = 0
let disagree = 0
for (const line of lines) {
  const [domain, url] = line.split('\t')
  if (!url) {
    console.log(`POMINIETE ${domain}: brak adresu rejestracji w wierszu`)
    continue
  }
  const { found, status, bytes } = await captchasOn(url)
  const hit = found.length > 0
  const expected = control ? !hit : hit
  if (expected) agree += 1
  else disagree += 1
  if (!expected) {
    console.log(`NIEZGODA ${domain.padEnd(18)} ${status} ${String(bytes).padStart(7)}B  znaleziono: ${found.join(', ') || 'nic'}  ${url}`)
  }
}

console.log(`\n${lines.length} sprawdzonych: ${agree} zgodnych z naszym wierszem, ${disagree} niezgodnych`)
console.log(control ? 'kontrolka: niezgoda znaczy, ze znalezlismy CAPTCHA tam, gdzie mowimy, ze jej nie ma' : 'oskarzenia: niezgoda znaczy, ze CAPTCHY tam nie ma')
process.exit(0)
