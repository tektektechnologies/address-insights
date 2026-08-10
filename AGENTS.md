<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Address Insights Project Rules

1. Work incrementally. Only implement the task explicitly requested in the current prompt.
2. Before editing, inspect the relevant existing files and package.json.
3. Never rewrite unrelated files or perform broad refactors unless explicitly requested.
4. Never upgrade Next.js, React, TypeScript, Tailwind, ESLint, or other existing framework dependencies unless explicitly requested.
5. Prefer the smallest implementation that satisfies the requirement.
6. Use TypeScript strictly. Do not use `any`, `@ts-ignore`, `@ts-expect-error`, or disable ESLint rules just to make checks pass.
7. Do not expose secret API keys to client components. Environment variables containing secret keys must not use the `NEXT_PUBLIC_` prefix.
8. External API calls involving secret credentials must happen in server-side Next.js Route Handlers or server-only modules.
9. Validate all request parameters at API boundaries.
10. Encode all user-provided values using URLSearchParams or other safe APIs. Never concatenate raw user input into external API URLs or Overpass queries.
11. Latitude, longitude and radius values used in Overpass queries must first be parsed and validated as finite numbers and bounded to safe ranges.
12. Every external fetch must handle non-2xx responses, malformed data, network failure, and timeout.
13. Do not log API keys, authorization headers, or secrets.
14. Do not commit `.env.local` or any real credentials.
15. Keep external API provider URLs centralized in server-side configuration/constants where practical.
16. Components should remain small and focused.
17. Keep deterministic business logic such as scoring in pure functions separate from UI and network code.
18. The application must remain responsive and accessible. Forms need labels, buttons need clear text or aria-labels, keyboard usage must work, and visible focus states must not be removed.
19. The results URL must contain enough information to reconstruct a result when opened in another browser without relying on React state or localStorage.
20. localStorage may only be used for recent search history, not as the source of truth for a shared insights page.
21. Map attribution for OpenStreetMap must always remain visible.
22. LocationIQ attribution required by its free plan must remain visible.
23. Do not implement bulk/offline OpenStreetMap tile downloads.
24. Do not implement speculative address autocomplete unless specifically requested.
25. Avoid unnecessary packages, state-management libraries, databases, authentication systems, and abstractions.
26. After every implementation task, run:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm run build`
27. If tests exist, also run the relevant tests.
28. If a verification command fails, fix only the failure caused by the current work. Do not hide or suppress the error.
29. At the end of every task, report:
   - files changed
   - important implementation decisions
   - verification commands run
   - whether every verification command passed
30. Stop after completing the requested task. Do not start future features proactively.
