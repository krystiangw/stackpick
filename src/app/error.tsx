'use client'

/**
 * On 2026-08-11 a single failing database query answered 500 on every page for 44 minutes, with
 * nothing on screen but the framework's default. A page whose whole content is a measurement can
 * fail, and when it does it should say which measurement and what still works, because a visitor
 * who came to scan their own domain can still do that.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-20">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Something broke</p>
        <h1 className="mt-4 max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-tight">
          We could not read the corpus this page is made of.
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          The numbers on this page are recomputed from the stored scans on every request, so when the store
          is unreachable there is nothing honest to show. Nothing is wrong with your domain and nothing has
          been published incorrectly: this page simply has no data to render right now.
        </p>
        {/* Plain anchors on purpose: this page renders because something in the app broke, and a
            client-side navigation asks the same broken tree to render the next route. A full page
            load is the one thing here that does not depend on what just failed. */}
        <div className="mt-8 flex flex-wrap gap-4 font-mono text-sm">
          <button
            onClick={reset}
            className="border border-ink px-5 py-2.5 transition-colors hover:bg-ink hover:text-ground"
          >
            Try again
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="px-5 py-2.5 text-brass underline underline-offset-4">
            Scan a domain, which does not need this page
          </a>
          <a href="/methodology" className="px-5 py-2.5 text-brass underline underline-offset-4">
            Read the method, which is static
          </a>
        </div>
      </section>
    </main>
  )
}
