/**
 * What a build run can reach on this machine right now.
 *
 *   npx tsx harness/sandbox/exposure.mts
 *
 * A build run executes the vendor's package and trusts their MCP server's tool descriptions, so
 * everything the process can read is something a hostile vendor can ask for. Nobody had measured
 * what that is, and an unmeasured exposure is argued about instead of fixed.
 *
 * Prints names and paths, never values. A report that quotes a token to prove the token is readable
 * has published the token.
 */
import { readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const SECRET_ENV = /(_KEY|_TOKEN|_SECRET|PASSWORD|_URI|_DSN|CREDENTIAL|_PAT$|^AWS_|^HEROKU_|^GH_|^GITHUB_TOKEN)/i
// Files worth naming because their whole content is a credential, not because they are unusual.
const CREDENTIAL_PATHS = [
  '.claude/.credentials.json',
  '.codex/auth.json',
  '.config/gh/hosts.yml',
  '.netrc',
  '.npmrc',
  '.aws/credentials',
  '.ssh',
  '.config/gcloud/credentials.db',
  '.docker/config.json',
  '.kube/config',
]

const home = homedir()
const readable = (at: string) => {
  try {
    statSync(at)
    return true
  } catch {
    return false
  }
}

const env = Object.keys(process.env).filter((name) => SECRET_ENV.test(name)).sort()
const files = CREDENTIAL_PATHS.filter((relative) => readable(path.join(home, relative)))
const keys = readable(path.join(home, '.ssh'))
  ? readdirSync(path.join(home, '.ssh')).filter((name) => !name.endsWith('.pub') && name !== 'known_hosts')
  : []

console.log('\nco widzi proces biegu, jesli nic go nie odgradza\n')
console.log(`  zmienne srodowiskowe wygladajace na sekret: ${env.length}`)
for (const name of env) console.log(`    ${name}`)
console.log(`\n  pliki, ktorych cala tresc to poswiadczenie: ${files.length}`)
for (const file of files) console.log(`    ~/${file}`)
if (keys.length > 0) console.log(`    (w tym ${keys.length} kluczy prywatnych w ~/.ssh)`)

console.log(`\n  katalog roboczy biegu: ${process.env.LETAGENTSIN_RUNS ?? path.join(home, '.letagentsin-runs')}`)
console.log('  (poza repozytorium i z wlasnym git init, co juz dziala i chroni pomiar, nie sekrety)')

const total = env.length + files.length
console.log(
  total === 0
    ? '\nNic z powyzszego nie jest osiagalne. Bieg mozna uruchomic.\n'
    : `\n${total} rzeczy, o ktore wrogi pakiet albo opis narzedzia MCP moze poprosic agenta i dostanie.\nUruchamiaj bieg przez harness/sandbox/run.sh, ktory czysci srodowisko i podstawia puste HOME.\n`,
)
