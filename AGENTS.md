# Codex Local Instructions

This project follows the rules in `/Users/chengrundong/Documents/Trae/Pin/.trae/project_rules.md`.

`PROJECT_RULES.md` in this repository is now only a bridge/reminder file. The old local rule content is deprecated.

Before product/design/development/testing/release work:
- Read `/Users/chengrundong/Documents/Trae/Pin/.trae/project_rules.md` first.
- Treat that Trae rule document as the canonical execution rule for Codex + SOLO collaboration.
- Treat Feishu project documents as the source of truth for product, design, requirements, and test materials.
- Follow the staged process and owner split in the rules:
  - SOLO: requirements, test cases, test execution, online regression, Feishu document maintenance.
  - Codex: UI/UE design specification, code development, development self-test, bug fixes, release.
- Keep code changes aligned with the uni-app Vue 3 TypeScript stack and the multi-platform constraints described in the rules.
- Use Conventional Commits when committing changes.

Security note:
- Do not store access tokens in repository files or project documents.
- If a token appears in a document, treat it as compromised and revoke it immediately.
