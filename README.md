# shipi18n-cli — moved & now bring-your-own-LLM

> [!IMPORTANT]
> **This repository is archived.** The Shipi18n CLI now lives in the
> **[Shipi18n/shipi18n](https://github.com/Shipi18n/shipi18n)** monorepo and is published to npm as
> **[`@shipi18n/cli`](https://www.npmjs.com/package/@shipi18n/cli)** — run it with `npx @shipi18n/cli`.

[![npm](https://img.shields.io/npm/v/@shipi18n/cli?label=%40shipi18n%2Fcli)](https://www.npmjs.com/package/@shipi18n/cli)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## What changed

The hosted Shipi18n API has been **retired**. The CLI is now **open source** and **bring-your-own-LLM**:

- The structural **check** (missing keys, dropped placeholders, collapsed plurals) needs **no API key**:
  `npx @shipi18n/cli check ./locales -s en`
- **Translation** uses *your own* Anthropic or OpenAI key (or any OpenAI-compatible endpoint) — no
  signup, no Shipi18n API key, and nothing sent to any Shipi18n server.

Anything the old README described here — signing up for an API key, a free tier / pricing plans,
`SHIPI18N_API_KEY`, or "100+ languages via Google Cloud Translation" — refers to the retired hosted
product and **no longer applies.**

## Where to go now

- **Source & docs:** https://github.com/Shipi18n/shipi18n
- **npm:** https://www.npmjs.com/package/@shipi18n/cli
- **What Shipi18n is today:** an open-source i18n **QA linter** for CI, plus optional bring-your-own-LLM
  translation and an MCP server. Apache-2.0, no account, no server.

## License

Apache-2.0.
