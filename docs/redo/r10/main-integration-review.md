# Main integration review

## Source

- `artifacts/redo/r10/main-integration.json`
- Remote `origin/main` before and after integration.
- Premerge evidence commit `cc9f18f34bffcdd52e68f75fef2e3ceb0da8b67a`.

## Methodology

- Remote main was fetched immediately before integration.
- Its SHA was compared with the Planner-reported baseline.
- Git showed no common ancestor between legacy main and the approved redo chain.
- A normal two-parent merge used the `ours` strategy to retain the approved release tree.
- The strategy preserves both histories without choosing the failed legacy product tree.
- Release tree hashes before and after merge were compared.
- The release branch and main were pushed without force.

## Pass criteria

- Remote main before must equal `081f09840c02cf3b448c2dc220763f8d69d99660`.
- Premerge gate must already pass on the remote branch.
- The merge must preserve both parent histories.
- The product tree must remain byte-identical to the release candidate.
- Round 9 must remain an ancestor.
- Force push, squash, and rebase must be false.

## Measured result

- Merge commit: `825b4c77b7c09f0fc3abc3c8cbba419eab50d007`.
- Parents: release evidence head and legacy main.
- Tree before and after: `9f844447082e669abc7c4fab396c6c729831b51c`.
- Remote main and release branch both reached the merge commit.
- Approved history preserved: true.
- Result: PASS.

## Risks and limitations

- The unrelated history required an explicit merge strategy.
- Legacy failed files are preserved in history, not in the merged release tree.
- Postmerge verification is required before any Production deployment.

## Evidence

- Git parent, ancestor, tree, and remote SHA measurements are persisted in the artifact.
