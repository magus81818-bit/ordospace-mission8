# Round 10 Production Rollback Plan

## Target

- Existing Vercel project: `ordospace-rebuild`
- Production alias: `https://ordospace-rebuild.vercel.app/`
- No alias transfer and no new project creation are permitted.

## Last known good Production deployment

- Deployment ID: `dpl_5vC4sqaFwwu4mihQw7CLuCKbTQnz`
- Deployment URL: `https://ordospace-rebuild-4qkidu67c-akiryu16180339-2308s-projects.vercel.app`
- Source repository: `magus81818-bit/ordospace-rebuild`
- Source branch and commit: `main` at `ea1dc111440207608401c529b5bc27ebc5e61fd7`
- Status before Round 10 release: `Ready`

## Rollback procedure

Use Vercel **Instant Rollback** for the existing `ordospace-rebuild` project and
select deployment `dpl_5vC4sqaFwwu4mihQw7CLuCKbTQnz`. This keeps the established
Production domain on the established project.

Rollback is required if Production smoke testing fails, role or route guards
regress, a new browser/HTTP/CSS/overflow failure appears, or the deployed release
cannot be traced to writable `main` commit
`825b4c77b7c09f0fc3abc3c8cbba419eab50d007`.

After rollback, confirm the alias resolves to the recorded deployment, repeat
public route smoke checks, and confirm the original source repository remains
clean and unchanged.

Production verification is non-mutating. No customer or application data writes
are part of the release or rollback checks.
