import { scanDomain } from '../src/lib/scan'
import { scoreFindings } from '../src/lib/score'

async function main() {
  const domains = process.argv.slice(2)
  if (domains.length === 0) {
    console.error('usage: pnpm scan <domain> [domain...]')
    process.exit(1)
  }

  for (const domain of domains) {
    try {
      const findings = await scanDomain(domain)
    const card = scoreFindings(findings)
    const stages = card.stages.map((s) => `${s.letter}=${s.points}/${s.max}`).join(' ')
    console.log(
      `${findings.domain.padEnd(24)} ${String(card.total).padStart(2)}/${card.max}  ${stages}  ${findings.durationMs}ms`,
    )
    if (process.env.VERBOSE) {
      console.log(`  docs=${findings.discovered.docs}`)
      console.log(`  signup=${findings.discovered.signup} -> ${findings.funnel.signup.statusesSeen.join(',')}`)
      console.log(`  npm=${findings.discovered.npmPackage} types=${findings.npm.bundledTypes} stale=${findings.npm.staleMonths}mo`)
      console.log(`  crawlDelay=${findings.robots.crawlDelaySeconds} blockedUser=${findings.robots.blockedByClass.user.join(',') || 'none'}`)
      for (const check of card.checks) {
        console.log(`  ${check.points === check.max ? 'PASS' : 'FAIL'} ${check.id.padEnd(26)} ${check.detail}`)
      }
    }
    } catch (error) {
      console.log(`${domain.padEnd(24)} ERROR ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

void main()
