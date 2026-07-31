# Clean-room review

## Source

- `artifacts/redo/r10/clean-room-verification.json`
- `artifacts/redo/r10/test-results.json`
- Disposable path recorded in the artifact.

## Methodology

- A new worktree was created at exact Round 9 HEAD.
- Root, backend, and four independent Playwright package dependency trees used `npm ci`.
- Round 9 ran first on its exact approved branch name.
- Round 1 through Round 8 then ran with generated evidence isolated on a disposable branch.
- Root build, syntax, static, smoke, MVP, Prisma, backend test, type, and build were executed.
- Product tree hashes were compared before cleanup.
- The disposable worktree was removed after evidence extraction.

## Pass criteria

- Every final command exits zero.
- Round 1 through Round 9 pass.
- Backend passes 4 suites and 18 tests.
- Product artifact hash equals the approved value.
- Local-only source and untracked dependency counts are zero.

## Measured result

- Round results: 4, 73, 4, 9, 4, 5, 3, 3, and 6 browser cases plus validators.
- Runtime smoke: 12 routes and QA 20/20.
- Product hash: `ffb97921f2807d2dc1e16893abfb0aadc4330307c4b142791a6a05f1005d33e8`.
- Initial Round 7 branch-name rejection was disclosed and resolved without source changes.
- Final result: PASS.

## Risks and limitations

- Root audit reports 3 high advisories.
- Backend audit reports 4 moderate and 21 high advisories.
- Locked test dependencies emit deprecation notices.
- No audit fix was run.

## Evidence

- Predeploy screenshots copied to `evidence/redo/r10/predeploy/`.
