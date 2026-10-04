---
name: Preview interaction checks
description: Workspace constraints and proxy behavior for browser-based app verification
---

This workspace has headless Chromium and Node's built-in WebSocket available, but Playwright/Puppeteer are not installed by default. The preview proxy normalizes port 80, so Chromium reports `http://127.0.0.1/` even when navigation uses `:80`.

**Why:** Browser-based interaction checks needed a reliable path without adding test dependencies.

**How to apply:** Use Chrome DevTools Protocol for interactive checks, match the normalized preview origin, and wait for the navigation event plus the expected app state after reload.