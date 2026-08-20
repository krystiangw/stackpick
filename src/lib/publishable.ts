import { getStore, heldReport, type Report } from './store'
import type { Scorecard } from './score'

/**
 * What a stored report is allowed to say when we serve it today.
 *
 * A page under /r/<id> is not an archive. It is a claim we are still publishing, at an address we
 * mailed to the vendor ourselves, and it renders the scorecard exactly as it was written. So when
 * a rule of ours turns out to have charged somebody without evidence, the stored row keeps the
 * record and this gate decides what a reader is shown.
 *
 * It is deliberately not a rescore. Rescoring a dated document with today's formula is the thing
 * we accuse vendors of: quietly rewriting your own file. The row is never touched; only the
 * rendering is, and the page says so.
 *
 * Each entry matches on the SHAPE of the finding, never on the wording of the sentence, because
 * the wording is what changes.
 */
export type Degraded = { checkId: string; because: string; evidence?: string[] }

/**
 * 9.52. `oauth_dcr` charged a vendor for a missing `registration_endpoint` while rendering an
 * empty string where the document address belongs, because `metadataAt` was added on 2026-08-17
 * and older scans have no such field. 293 stored reports carry it. Our own first rule says a
 * measurement a vendor cannot repeat is not a finding, so this is unmeasurable and always was.
 */
const accusesWithoutNamingTheDocument = (report: Report): boolean => {
  const oauth = report.findings?.funnel?.oauth
  if (!oauth?.metadataPublished || oauth.metadataAt) return false
  const check = report.scorecard.checks.find((one) => one.id === 'oauth_dcr')
  return Boolean(check && check.points === 0 && !check.inconclusive && !check.notApplicable)
}

export function asPublishedToday(report: Report): { scorecard: Scorecard; degraded: Degraded[] } {
  if (!accusesWithoutNamingTheDocument(report)) return { scorecard: report.scorecard, degraded: [] }

  // Recovered from the scan's own record, and labelled as recovered where it is shown: these are
  // the origins this check asked for OAuth metadata, not everything the scan touched.
  const searched = report.findings?.funnel?.oauth?.probedOrigins ?? []
  const checks = report.scorecard.checks.map((check) =>
    check.id === 'oauth_dcr'
      ? {
          ...check,
          inconclusive: true,
          detail:
            'Unmeasurable: this scan read OAuth metadata for you but did not record the address it read them at, so there is nothing here you could check. Withdrawn on 20 August 2026.',
          unblock: 'Nothing for you to do. A rescan records the address and this becomes measurable.',
        }
      : check,
  )
  // The denominator moves with it. A check that no longer counts against the vendor must stop
  // counting in what we scored them out of, or the page shows a total that its own rows deny.
  const withdrawn = report.scorecard.checks.find((one) => one.id === 'oauth_dcr')
  const lost = withdrawn?.max ?? 0
  // The stage carries its own denominator and the page prints both. Correcting only the total left
  // the entry stage still scored out of the withdrawn point, so the page contradicted itself one
  // heading apart (codex).
  // `measurable ?? max` before subtracting, the same fallback the rest of the app uses. The field
  // was added later and 26 stored reports predate it, 8 of them among the ones this gate corrects:
  // subtracting from `undefined` would have published "7/NaN" on exactly the pages we are here to
  // fix (codex). Fourth time today that a field added later changed the meaning of an old record.
  const stages = report.scorecard.stages?.map((stage) =>
    stage.stage === withdrawn?.stage ? { ...stage, measurable: (stage.measurable ?? stage.max) - lost } : stage,
  )
  return {
    scorecard: {
      ...report.scorecard,
      checks,
      ...(stages ? { stages } : {}),
      measurable: (report.scorecard.measurable ?? report.scorecard.max) - lost,
    },
    degraded: [
      {
        checkId: 'oauth_dcr',
        because:
          'We published this without naming the document we read, so you could not check it. The rule changed in formula 9.52 and the finding is withdrawn here.',
        ...(searched.length > 0 ? { evidence: searched } : {}),
      },
    ],
  }
}

/**
 * The only way a public surface should load a stored report.
 *
 * Applying the gate at each renderer was wrong and codex caught it three times in a row: the page
 * corrected the scorecard while the metadata, the share image, the category rank and the
 * comparison were all still built from the stored one, so the same report withdrew a finding in
 * one paragraph and published conclusions drawn from it in the next. There is one entrance, so
 * there is one place to correct.
 */
export async function reportAsPublished(id: string): Promise<{ report: Report; degraded: Degraded[] } | null> {
  const stored = (await getStore().getReport(id)) ?? heldReport(id)
  if (!stored) return null
  const { scorecard, degraded } = asPublishedToday(stored)
  return { report: { ...stored, scorecard }, degraded }
}
