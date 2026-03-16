# Reference Documentation

Comprehensive codebase documentation is available in `docs/reference/claude/`:

| Document | Description |
|----------|-------------|
| [INDEX.md](../../docs/reference/claude/INDEX.md) | Start here - full index |
| [architecture.md](../../docs/reference/claude/architecture.md) | System overview, data flow |
| [patterns.md](../../docs/reference/claude/patterns.md) | Coding patterns to follow |
| [commands.md](../../docs/reference/claude/commands.md) | All pnpm commands |

**Read docs on-demand** using the Read tool when you need specific information.
Do NOT read all docs upfront - this wastes context.

## Quick Reference (Essential)

- **Dev commands**: `pnpm dev`, `pnpm test`, `/e2e-test-runner`
- **Document model**: Everything is a document with `document_type` field
- **Editor layout**: 4-panel (Icon Rail | Sidebar | Content | Properties)
- **Session timeout**: 15min inactivity, 12hr absolute
