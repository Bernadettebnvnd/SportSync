<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Instructions & Workflow

- **Git Commit Confirmation**: Whenever any changes or edits are made to the codebase at the user's request, always proactively ask the user if they would like to commit (and push) those changes, and suggest an appropriate commit message — **unless** the user explicitly instructs an immediate commit (e.g., `"commit immediately"`, `"commit to main immediately"`, `"commit once done"`), in which case commit and push right after verification passes.
- **Pre-Flight Check Before Coding**: Before editing code for a bug fix or feature update, pull latest `main` (`git pull`) and inspect recent commits (`git log -n 15 --oneline`) plus the target files to verify whether the fix is already implemented or partially done. Skip already-resolved parts to prevent overlapping edits.
- **Strict Scope & Dependencies**: Keep edits strictly scoped to the requested files and screens. Do not modify unrelated flows or add new npm dependencies unless explicitly requested.
- **Verification Before Committing**: Run `npx tsc --noEmit`, `npx eslint` on all touched files, and `npm run build` and confirm 0 errors before committing. If `tsc` reports duplicate type errors (`TS6200` / `TS2300`) from macOS duplicate files inside `.next/types/` (e.g., `* 2.ts`), run `rm -rf .next` and re-run the build and typecheck.
- **SportSync Domain Guardrails**:
  - Pilot market scope is strictly **Naga City** across onboarding and discovery.
  - Never introduce hardcoded mock payment numbers, fake promo codes, simulated auth popups, or unauthenticated `body.userId` / `hostId` auth bypasses.

