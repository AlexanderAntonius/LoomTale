# Changelog

## [1.4.0] - 2026-11-08

### Added
- 🔒 **PIN-Protected Nevagate Premium Models**: Curated low-multiplier models (DeepSeek V4 Pro, DeepSeek V4 Flash, GLM 5.2, MiMo V2.5 Pro, Kimi K2.7 Code) guarded by PIN code (`123123`) to prevent unauthorized usage.
- 🛡️ **Zero-Paid-Failover Rule**: Any error or high demand on a Nevagate model strictly fails over to the Gemini Free Tier cascade, never to another paid model.
- ⚡ **Vercel Serverless CORS Relay**: High-performance `/api/nevagate` edge handler bypassing browser CORS restrictions.

## [1.3.6] - 2026-11-07
- Model switcher dropdown with smart Gemini auto-failover cascade.

## [1.2.0] - 2026-10-05

### Added
- 🧠 **Incremental Memory Digest & Notebook**: Dramatic token savings (~90% less token usage per turn) while maintaining persistent story memory, key events, character facts, and inventory across 180+ turns.
- 📓 **Memory Modal**: View and manually update/save story digest at any time.
- ✏️ **Edit & Regenerate**: Edit any past user message to fork/regenerate the AI response, or edit AI messages directly.
- 📋 **Copy to Clipboard**: Quick 1-click copy button on every story turn.
- 🏷️ **Version Badge & Release Notes**: View current app version and changelog directly from the sidebar.

## [1.1.0] - 2026-09-03
- Multi-story history sidebar & autosave.
- AI-generated book titles for stories.
- Mobile keyboard auto-dismiss & smooth scroll snapping.

## [1.0.0] - 2026-09-02
- Initial release of Loomtale with Gemini Flash integration, dynamic mood backgrounds, and Master Roleplay prompt.
