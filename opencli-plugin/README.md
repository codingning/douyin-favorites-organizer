# Douyin saved OpenCLI plugin

This bundled, read-only plugin provides the `opencli douyin saved` command required by the organizer.
It reuses the browser session managed by OpenCLI and does not persist cookies, raw page state, or signed media URLs.

Install and verify it from the repository root:

```powershell
npm run setup
```

The adapter is reused from `codingning/douyin-obsidian-knowledge` at commit
`44ac50439464a729f15fb753e8c575f6e72a82f1`. Keeping a frozen copy here makes a clean installation self-contained instead of relying on a plugin that happened to exist on the maintainer's machine.
