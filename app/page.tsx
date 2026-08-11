import { AddressSearchForm } from "@/src/components/AddressSearchForm";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-[var(--canvas)] text-[var(--ink)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,118,110,0.14),_transparent_55%),linear-gradient(180deg,_#eef5f4_0%,_#f7faf9_42%,_#edf2f1_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]"
      />

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-16 sm:px-8 sm:py-20">
        <div className="animate-[rise_500ms_ease-out]">
          <p className="font-display text-4xl leading-none font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
            Address Insights
          </p>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--ink-muted)] sm:text-xl">
            Search a street address to explore nearby amenities and readable
            walkability, drivability, and urban-context scores.
          </p>
        </div>

        <section className="mt-10 animate-[rise_600ms_ease-out] rounded-2xl border border-[var(--line)] bg-[var(--surface)]/90 p-5 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:p-7">
          <AddressSearchForm />
          <p className="mt-5 text-sm leading-relaxed text-[var(--ink-faint)]">
            Amenities come from real OpenStreetMap data. Walkability, drivability,
            and urban scores are transparent heuristics—not official ratings.
          </p>
        </section>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-2xl px-5 pb-8 text-sm text-[var(--ink-faint)] sm:px-8">
        <p>
          Search by{" "}
          <a
            href="https://locationiq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[var(--line-strong)] underline-offset-2 transition-colors hover:text-[var(--ink-muted)] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            LocationIQ
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
