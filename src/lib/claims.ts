/**
 * Zdania o SKALI cudzego zachowania, ktorych nie zmierzylismy.
 *
 * Liczby na naszych stronach sa policzone przy renderze, a kwantyfikator obok nich bywal wpisany
 * raz i nic go nie odswiezalo. Jednego wieczoru znalazly sie cztery takie zdania, w tym jedno w
 * platnym raporcie i jedno w dokumencie, ktory prospekt czyta przed zakupem.
 *
 * Wzorzec mieszka tutaj, bo pilnuja go dwie rozne bramki: `rules.mts` czyta ZRODLA przed buildem,
 * a `audit-sample.mts` czyta DOKUMENT juz zapisany w bazie - kod poprawiony nie poprawia dokumentu,
 * ktory wyszedl wczoraj.
 */
export const UNMEASURED_SCALE =
  /\b((almost|nearly) (every(body|one)?|all|no(body|ne))|hardly any|vast majority|most (vendors|sites|companies|servers|domains|of them))\b/i

/** Pierwsze takie zdanie w tekscie, albo pusty napis. Pusty znaczy „czysto", nie „nie sprawdzone". */
export const scaleGuessIn = (text: string): string => UNMEASURED_SCALE.exec(text)?.[0] ?? ''

/**
 * Tekst BEZ cudzych slow: raport cytuje odpowiedzi agentow doslownie, a to, ze jakis przebieg
 * napisal „most vendors", nie jest naszym oszacowaniem. Bez tego bramka potrafilaby swiecic na
 * czerwono, dopoki cytat sie nie zmieni, czyli po naszej stronie nigdy (codex).
 *
 * Wycinamy CALE linie cytatu, a nie zawartosc miedzy cudzyslowami: cytat sam bywa z cudzyslowami w
 * srodku („Acme calls this „automatic", and most vendors..."), wiec dopasowanie do najblizszego
 * zamykajacego konczylo sie w polowie cudzej wypowiedzi i reszta wracala jako nasze zdanie (codex).
 * Linia cytatu ma w tym raporcie staly ksztalt: `- **<narzedzie> run <n>**: „..."`.
 *
 * GRANICA: dowody w werdyktach cytuja dokumentacje vendora w prostych cudzyslowach w srodku naszego
 * zdania. Tego nie wycinamy, bo nie da sie tam oddzielic cytatu od zdania - jesli kiedys oblejemy na
 * takim wierszu, to jest miejsce, w ktorym trzeba to zobaczyc.
 */
export const ourWordsIn = (markdown: string): string =>
  markdown
    .split('\n')
    .filter((line) => !/^- \*\*.+ run \d+\*\*[^:]*:\s*\u201c/.test(line))
    .join('\n')
    .replace(/^```[\s\S]*?^```/gm, ' ')

/**
 * To samo pytanie o DOSTARCZONY dokument, w obu jego postaciach.
 *
 * Dokument jest zapisany, wiec poprawka w kodzie go nie dotyka: trzy stare probki pod `/d/<id>`
 * nadal nios\u0142y zdanie wycofane z `fixfirst.ts`. Nie przepisujemy tego, co ktos dostal, i nie
 * kasujemy - strona ma o tym POWIEDZIEC.
 *
 * Czytamy tylko NASZA proze: w modelu sa to porady i zdanie o planie naprawy. Cytaty z przebiegow i
 * dowody cytowane z dokumentacji vendora sa czyimis slowami.
 */
export const retractedScaleIn = (delivery: {
  markdown?: string
  model?: { fixes?: { how: string }[]; fixClaim?: string | null } | null
}): string => {
  const fromModel = [delivery.model?.fixClaim ?? '', ...(delivery.model?.fixes ?? []).map((fix) => fix.how)].join('\n')
  const ours = delivery.model ? fromModel : ourWordsIn(delivery.markdown ?? '')
  return scaleGuessIn(ours)
}
