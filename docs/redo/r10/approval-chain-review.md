# Approval chain review

## Source

- `artifacts/redo/r10/approval-chain-audit.json`
- Remote redo branch references on `origin`.
- Planner-approved Round 1 through Round 9 SHAs.

## Methodology

- Every SHA is resolved as a Git commit.
- Each round is checked as a descendant of the prior approved round.
- Each remote redo branch head is compared with its approved SHA.
- Remote divergence and unexpected commits are enumerated.
- The Matrix history and Round 9 validator result are inspected.

## Pass criteria

- Nine approved commits must exist.
- Every ancestry edge must be true.
- Each remote branch must equal its approved head.
- Behind and unexpected-commit counts must be zero.
- Matrix drift must be false.

## Measured result

- R1 through R9 commits: 9 of 9 found.
- Ancestry edges: 8 of 8 passed.
- Exact remote branch heads: 9 of 9.
- Unexpected commits: 0.
- Matrix changed: false.
- Round 9 validator: PASS.
- Result: PASS.

## Risks and limitations

- Failed historical `ui/*` branches remain in the repository but are not ancestors of the approved redo chain.
- Remote refs are fetched again immediately before main integration.
- Any new remote change invalidates this result.

## Evidence

- Approved SHAs and branch names are stored per row in the artifact.
