#!/usr/bin/env node
// setup-opencode.mjs
// Auto-install opencode + setup oh-my-opencode-slim plugin, per-agent models,
// SeizAI provider, MCP servers, and the Zellij multiplexer.
// Secrets are prompted interactively and never hardcoded.
// Works with both `node setup-opencode.mjs` and `bun setup-opencode.mjs`.

import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { homedir } from "node:os";
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// opencode reads its global config from ~/.config/opencode/
const CONFIG_DIR = join(homedir(), ".config", "opencode");
const CONFIG_PATH = join(CONFIG_DIR, "opencode.json");
const SLIM_PATH = join(CONFIG_DIR, "oh-my-opencode-slim.json");
const SKILLS_DIR = join(CONFIG_DIR, "skills");

// embedded skills (base64 of SKILL.md), written to ~/.config/opencode/skills/<name>/SKILL.md
const SKILLS_B64 = {
  "multi-brain": "LS0tCm5hbWU6IG11bHRpLWJyYWluCmRlc2NyaXB0aW9uOiBTaGFyZWQgd29ya2luZyBtZW1vcnkgYWNyb3NzIGFnZW50cyAoQ29kZXgsIE9wZW5Db2RlLCBDbGF1ZGUgQ29kZSwgRmFjdG9yeSBEcm9pZCkgc3RvcmVkIGluIGFuIE9ic2lkaWFuIHZhdWx0IG92ZXIgV2ViREFWLiBVc2Ugd2hlbiB3b3JrIHNob3VsZCBsZWF2ZSByZXN1bWFibGUgY29udGV4dCBmb3IgYW5vdGhlciBhZ2VudCBvciBzZXNzaW9uIHRocm91Z2ggYSB0d28tbGV2ZWwgaW5kZXggaW4gL211bHRpYnJhaW4vc2Vzc2lvbi5tZCwgbmFtZWQgYnVja2V0cyBpbiAvbXVsdGlicmFpbi9pbmRleGVzLywgYW5kIHNlbGVjdGl2ZSBkZWVwIG5vdGVzIGluIC9tdWx0aWJyYWluL2NvbnRleHQvLgp1c2VyLWludm9jYWJsZTogdHJ1ZQpkaXNhYmxlLW1vZGVsLWludm9jYXRpb246IGZhbHNlCi0tLQoKIyBNdWx0aS1CcmFpbiAoT2JzaWRpYW4gV2ViREFWIGVkaXRpb24pCgojIyBPdmVydmlldwoKRW5hYmxlIHNoYXJlZCB3b3JraW5nIG1lbW9yeSBhY3Jvc3MgbXVsdGlwbGUgY29kaW5nIGFnZW50cyB3aXRob3V0IGZvcmNpbmcgZXZlcnkgYWdlbnQgdG8KcmVyZWFkIGV2ZXJ5IGRldGFpbC4gTWVtb3J5IGxpdmVzIGluIHRoZSBPYnNpZGlhbiB2YXVsdCwgYWNjZXNzZWQgdGhyb3VnaCB0aGUKYG9ic2lkaWFuLXdlYmRhdmAgTUNQIHNlcnZlci4gS2VlcCBgL211bHRpYnJhaW4vc2Vzc2lvbi5tZGAgYXMgYSBzbWFsbCBtYXN0ZXIgaW5kZXgsIHN0b3JlCnRhc2stb3JpZW50ZWQgZW50cnkgbGlzdHMgaW4gYC9tdWx0aWJyYWluL2luZGV4ZXMvYCwgYW5kIGtlZXAgZnVsbGVyIGNvbnRleHQgb25seSBpbiBwb2ludGVkCm1hcmtkb3duIGZpbGVzIGluc2lkZSBgL211bHRpYnJhaW4vY29udGV4dC9gLgoKVGhpcyBpcyB0aGUgV2ViREFWIGFkYXB0YXRpb24gb2YgdGhlIGBtdWx0aS1icmFpbmAgc2tpbGwgKGVub3dkZXYvZW5vd1gtU2tpbGwpLiBUaGUgdHdvLWxldmVsCmxvZ2ljIGlzIHVuY2hhbmdlZDsgb25seSB0aGUgc3RvcmFnZSBsYXllciBhbmQgYm9vdHN0cmFwIGRpZmZlci4KCiMjIFN0b3JhZ2UgTGF5ZXIgKFdlYkRBViBtYXBwaW5nKQoKQWxsIHBhdGhzIGFyZSB2YXVsdC1yZWxhdGl2ZSB1bmRlciBgL211bHRpYnJhaW4vYC4gTmV2ZXIgdXNlIGxvY2FsIGZpbGVzeXN0ZW0gcGF0aHMuCgp8IE9wZXJhdGlvbiB8IFRvb2wgfAp8IC0tLSB8IC0tLSB8CnwgUmVhZCBhIGZpbGUgfCBgb2JzaWRpYW4td2ViZGF2X19fd2ViZGF2X2dldF9yZW1vdGVfZmlsZWAgfAp8IENyZWF0ZSBhIG5ldyBmaWxlIHwgYG9ic2lkaWFuLXdlYmRhdl9fX3dlYmRhdl9jcmVhdGVfcmVtb3RlX2ZpbGVgIHwKfCBVcGRhdGUgYW4gZXhpc3RpbmcgZmlsZSB8IGBvYnNpZGlhbi13ZWJkYXZfX193ZWJkYXZfdXBkYXRlX3JlbW90ZV9maWxlYCB8CnwgTGlzdCBhIGZvbGRlciB8IGBvYnNpZGlhbi13ZWJkYXZfX193ZWJkYXZfbGlzdF9yZW1vdGVfZGlyZWN0b3J5YCB8CnwgQ3JlYXRlIGEgZm9sZGVyIHwgYG9ic2lkaWFuLXdlYmRhdl9fX3dlYmRhdl9jcmVhdGVfcmVtb3RlX2RpcmVjdG9yeWAgfAp8IE1vdmUgLyByZW5hbWUgfCBgb2JzaWRpYW4td2ViZGF2X19fd2ViZGF2X21vdmVfcmVtb3RlX2l0ZW1gIHwKfCBEZWxldGUgfCBgb2JzaWRpYW4td2ViZGF2X19fd2ViZGF2X2RlbGV0ZV9yZW1vdGVfaXRlbWAgfAoKSWYgdGhlc2UgdG9vbHMgYXJlIG5vdCBsb2FkZWQsIGxvYWQgdGhlbSBmaXJzdCAoZS5nLiBUb29sU2VhcmNoIG9uIHRoZSBgb2JzaWRpYW4td2ViZGF2X19fKmAKbmFtZXMpLiBJZiB0aGUgV2ViREFWIHNlcnZlciBpcyB1bnJlYWNoYWJsZSwgdGVsbCB0aGUgdXNlciBpbnN0ZWFkIG9mIGZhbGxpbmcgYmFjayB0byBsb2NhbCBmaWxlcy4KCiMjIFVzZSBUaGlzIFNraWxsCgpVc2Ugd2hlbiBhbnkgdGFzayBzaG91bGQgbGVhdmUgYmVoaW5kIHJlc3VtYWJsZSBjb250ZXh0IGZvciBhbm90aGVyIGFnZW50IG9yIHRvb2wsIGVzcGVjaWFsbHkKd2hlbiBzd2l0Y2hpbmcgYmV0d2VlbiBDb2RleCwgT3BlbkNvZGUsIENsYXVkZSBDb2RlLCBGYWN0b3J5IERyb2lkLCBvciBsb25nLXJ1bm5pbmcgc2Vzc2lvbnMuCgpUeXBpY2FsIHRyaWdnZXJzOgotIENvbnRpbnVlIHdvcmsgc3RhcnRlZCBieSBhbm90aGVyIGFnZW50Ci0gTGVhdmUgYSBicmVhZGNydW1iIHRyYWlsIGJlZm9yZSBlbmRpbmcgYSBzZXNzaW9uCi0gQnVpbGQgbG9uZy10ZXJtIG1lbW9yeSB3aXRob3V0IGJsb2F0aW5nIHRoZSBtYWluIGNvbnRleHQgd2luZG93Ci0gU2hhcmUgdGFzayBwcm9ncmVzcyBhY3Jvc3MgdG9vbHMKCkRvIG5vdCB1c2UgZm9yIG9uZS1vZmYgdGhyb3dhd2F5IHRhc2tzIHdpdGggbm8gZm9sbG93LXVwIHZhbHVlLgoKIyMgTGF5b3V0CgpgYGB0ZXh0Ci9tdWx0aWJyYWluLwrilJzilIDilIAgc2Vzc2lvbi5tZCAgICAgICAgICAgICAgICAgICAgICAgIyBtYXN0ZXIgaW5kZXggKGluZGV4IG9mIGluZGV4ZXMpCuKUnOKUgOKUgCBpbmRleGVzLwrilIIgICDilJzilIDilIAgYWdlbnRzLm1kICAgICAgICAgICAgICAgICAgICAjIGdsb2JhbCBidWNrZXQK4pSCICAg4pSU4pSA4pSAIDxwcm9qZWN0Pi08dG9waWM+Lm1kICAgICAgICAgIyBwcm9qZWN0LXNjb3BlZCBidWNrZXRzCuKUlOKUgOKUgCBjb250ZXh0LwogICAg4pSU4pSA4pSAIFlZWVktTU0tREQtSEhNTS08YWdlbnQ+LTx0b3BpYz4ubWQKYGBgCgpNZW1vcnkgaXMgZ2xvYmFsIChjcm9zcy1wcm9qZWN0KS4gVXNlIGA8cHJvamVjdD4tPHRvcGljPmAgYnVja2V0IG5hbWVzIHRvIGF2b2lkIGNvbGxpc2lvbnM7CmtlZXAgZ2xvYmFsIHRvcGljcyBsaWtlIGBhZ2VudHNgIHVucHJlZml4ZWQuCgojIyBXb3JrZmxvdwoKIyMjIDAuIFN1cHBvcnQgYG11bHRpIGJyYWluIGluaXRgCgpXaGVuIHRoZSB1c2VyIGFza3MgdG8gaW5pdGlhbGl6ZSBNdWx0aS1CcmFpbiwgYm9vdHN0cmFwIHRoZSB2YXVsdDoKLSBDcmVhdGUgYC9tdWx0aWJyYWluL2AsIGAvbXVsdGlicmFpbi9pbmRleGVzL2AsIGAvbXVsdGlicmFpbi9jb250ZXh0L2AgaWYgbWlzc2luZwogIChhIDQwOSBDb25mbGljdCBtZWFucyBpdCBhbHJlYWR5IGV4aXN0cyDigJQgc2FmZSB0byBpZ25vcmUpLgotIENyZWF0ZSBgL211bHRpYnJhaW4vc2Vzc2lvbi5tZGAgaWYgbWlzc2luZy4KLSBDcmVhdGUgYXQgbGVhc3Qgb25lIHN0YXJ0ZXIgYnVja2V0IHN1Y2ggYXMgYC9tdWx0aWJyYWluL2luZGV4ZXMvYWdlbnRzLm1kYC4KCkRvIG5vdCBlZGl0IHJlcG8gYEFHRU5UUy5tZGAgLyBgQ0xBVURFLm1kYC4gVGhlICJyZWFkIGJyYWluIGZpcnN0IiBpbnN0cnVjdGlvbiBsaXZlcyBpbiB0aGlzCnNraWxsIGRlZmluaXRpb24sIGluc3RhbGxlZCBwZXIgYWdlbnQuCgojIyMgMS4gUmVhZCB0aGUgbWFzdGVyIGluZGV4IGZpcnN0CgpSZWFkIGAvbXVsdGlicmFpbi9zZXNzaW9uLm1kYCBiZWZvcmUgc3RhcnRpbmcgd29yay4gVHJlYXQgaXQgYXMgYW4gaW5kZXggb25seToKLSBSZWFkIGJ1Y2tldCBuYW1lcyBhbmQgc2hvcnQgc2NvcGUgZGVzY3JpcHRpb25zLgotIENob29zZSB0aGUgbW9zdCByZWxldmFudCBidWNrZXQgZm9yIHRoZSBjdXJyZW50IHRhc2suCi0gRG8gbm90IGFzc3VtZSBldmVyeSBidWNrZXQgb3IgY29udGV4dCBmaWxlIG11c3QgYmUgb3BlbmVkLgoKRGVjaXNpb24gcnVsZToKLSBSZWFkIG9ubHkgYHNlc3Npb24ubWRgIHdoZW4gdGhlIHRhc2sgaXMgdW5yZWxhdGVkIHRvIHByaW9yIHdvcmsuCi0gUmVhZCBvbmUgb3IgdHdvIG5hbWVkIGJ1Y2tldHMgd2hlbiB0aGUgdGFzayBjbGVhcmx5IG1hdGNoZXMgdGhlaXIgc2NvcGUuCi0gUmVhZCBjb250ZXh0IGZpbGVzIG9ubHkgd2hlbiB0aGUgY2hvc2VuIGJ1Y2tldCBwb2ludHMgdG8gZGV0YWlscyB0aGF0IG1hdHRlci4KCiMjIyAyLiBXcml0ZSBpbnRvIHRoZSByaWdodCBidWNrZXQgYWZ0ZXIgd29yawoKQWZ0ZXIgbWVhbmluZ2Z1bCB3b3JrLCBhZGQgb25lIGNvbmNpc2UgZW50cnkgdG8gdGhlIG1vc3QgcmVsZXZhbnQgZmlsZSBpbiBgL211bHRpYnJhaW4vaW5kZXhlcy9gCihjcmVhdGUgdGhlIGJ1Y2tldCBpZiBuZWVkZWQpLiBLZWVwIGVhY2ggZW50cnkgdG8gb25lIGxpbmU6Ci0gVGltZXN0YW1wIChXSUIpCi0gQWdlbnQgbmFtZQotIFNob3J0IGRlc2NyaXB0aW9uIG9mIHdoYXQgd2FzIGRvbmUKLSBBIGAtPmAgd2lraWxpbmsgcG9pbnRlciB0byB0aGUgZnVsbCBjb250ZXh0IG5vdGUKCk5ld2VzdCBlbnRyaWVzIG9uIHRvcC4gVGhlbiB1cGRhdGUgYC9tdWx0aWJyYWluL3Nlc3Npb24ubWRgIG9ubHkgYXMgbmVlZGVkOiBhZGQgYSBidWNrZXQgZW50cnkKd2hlbiBjcmVhdGluZyBhIG5ldyBidWNrZXQsIG9yIHJlZnJlc2ggdGhlIGB1cGRhdGVkYCBmaWVsZCAvIG9uZS1saW5lIHN1bW1hcnkgZm9yIGFuIGV4aXN0aW5nIG9uZS4KCiMjIyAzLiBXcml0ZSBhIGZ1bGwgY29udGV4dCBub3RlIHdoZW4gdXNlZnVsCgpDcmVhdGUgYSBmaWxlIGluIGAvbXVsdGlicmFpbi9jb250ZXh0L2Agd2hlbiB0aGUgd29yayBoYXMgZGV0YWlscyB3b3J0aCBwcmVzZXJ2aW5nOiBnb2FsLCB3aGF0CmNoYW5nZWQsIGtleSBkZWNpc2lvbnMsIGZpbGVzIHRvdWNoZWQsIGNvbW1hbmRzL3ZlcmlmaWNhdGlvbiB0aGF0IG1hdHRlcmVkLCBmb2xsb3ctdXAgaXRlbXMuClNraXAgaXQgb25seSB3aGVuIHRoZSB0YXNrIGlzIHRydWx5IHRyaXZpYWwuCgojIyMgNC4gTWFpbnRhaW4gYnVja2V0IHNpemUKClNvZnQgY2FwIH4yNSBlbnRyaWVzIHBlciBidWNrZXQuIFdoZW4gZXhjZWVkZWQsIHN1bW1hcml6ZSBvbGRlciBlbnRyaWVzIGludG8gYSBjb21wYWN0IGNvbnRleHQKbm90ZSBhbmQgcmVwbGFjZSBtYW55IG9sZCBlbnRyaWVzIHdpdGggb25lIGNvbXByZXNzZWQgc3VtbWFyeSwgcHJlc2VydmluZyBwb2ludGVycyB0aGF0IHN0aWxsCm1hdHRlci4gUHJlZmVyIHN1bW1hcml6aW5nIG92ZXIgZGVsZXRpbmcgcmF3IGhpc3RvcnkuCgojIyBPYnNpZGlhbiBDb252ZW50aW9ucwoKLSBFdmVyeSBmaWxlIHN0YXJ0cyB3aXRoIFlBTUwgZnJvbnRtYXR0ZXIgKGB0eXBlYCwgYHRhZ3NgLCBwbHVzIGBhZ2VudGAvYHByb2plY3RgL2BidWNrZXRgCiAgd2hlcmUgcmVsZXZhbnQpLgotIFBvaW50ZXJzIHVzZSB3aWtpbGlua3M6IGBbW211bHRpYnJhaW4vY29udGV4dC88ZmlsZT5dXWAgKG9taXQgdGhlIGAubWRgIGV4dGVuc2lvbikuCi0gQ29udGV4dCBmaWxlbmFtZXM6IGBZWVlZLU1NLURELUhITU0tPGFnZW50Pi08dG9waWM+Lm1kYC4KLSBNYXJrZG93biBvbmx5IGluIGluZGV4ZXM7IG5vIEpTT04sIFlBTUwgbG9ncywgb3Igc3RyZWFtLW9mLWNvbnNjaW91c25lc3Mgbm90ZXMuCi0gUmVjb3JkIGZhY3RzLCBub3QgbmFycmF0aW9uLgoKIyMgRW50cnkgRXhhbXBsZXMKCk1hc3RlciBpbmRleCBidWNrZXQgZW50cnk6CgpgYGBtZAotIGBlbm93eC1hdXRoYCDigJQgbG9naW4gKyB0b2tlbiByZWZyZXNoIHdvcmsuIExhc3QgdXBkYXRlZDogMjAyNi0wNi0xOCAxNjoxMCBXSUIgLT4gW1ttdWx0aWJyYWluL2luZGV4ZXMvZW5vd3gtYXV0aF1dCmBgYAoKTmFtZWQgYnVja2V0IGVudHJ5OgoKYGBgbWQKLSAyMDI2LTA2LTE4IDE2OjEwIFdJQiDigJQgQ29kZXg6IGZpeGVkIGxvZ2luIGZvcm0gdmFsaWRhdGlvbiAtPiBbW211bHRpYnJhaW4vY29udGV4dC8yMDI2LTA2LTE4LTE2MTAtY29kZXgtbG9naW4tZm9ybV1dCmBgYAo=",
  "ocs": "LS0tCm5hbWU6IG9jcwpkZXNjcmlwdGlvbjogT3JjaGVzdHJhdGlvbiBDb250cm9sIFN5c3RlbS4gQXV0by1jbGFzc2lmaWVzIHVzZXIgaW50ZW50LCBkZWxlZ2F0ZXMgdG8gc3BlY2lhbGl6ZWQgc3ViYWdlbnRzIChwbGFubmVyLCBnYXAtYW5hbHl6ZXIsIG9yYWNsZSwgZXhwbG9yZXIsIHJldmlld2VyKSwgbWFuYWdlcyBwYXJhbGxlbCBleGVjdXRpb24sIGVuZm9yY2VzIGNvbnRpbnVhdGlvbiwgYW5kIGdyb29tcyBjb250ZXh0IGZvciBsb25nIHNlc3Npb25zLiBBY3RpdmF0ZSBvbiBhbnkgbm9uLXRyaXZpYWwgbXVsdGktc3RlcCB0YXNrIG9yIHdoZW4gdXNlciBpbnZva2VzIC9vY3MuCnVzZXItaW52b2NhYmxlOiB0cnVlCmRpc2FibGUtbW9kZWwtaW52b2NhdGlvbjogZmFsc2UKLS0tCgojIE9DUzogT3JjaGVzdHJhdGlvbiBDb250cm9sIFN5c3RlbQoKWW91IGFyZSBub3cgb3BlcmF0aW5nIGFzIGFuIG9yY2hlc3RyYXRvci4gT0NTIGdvdmVybnMgaG93IHlvdSBjbGFzc2lmeSBpbnRlbnQsIGRlbGVnYXRlIHdvcmssIG1hbmFnZSBwYXJhbGxlbCBleGVjdXRpb24sIGVuZm9yY2UgY29tcGxldGlvbiwgYW5kIGtlZXAgY29udGV4dCBsZWFuLgoKIyMgQ29yZSBQcmluY2lwbGUKCk9yY2hlc3RyYXRvci1maXJzdCBleGVjdXRpb24gbW9kZToKLSBGb3IgYW55IG5vbi10cml2aWFsIHRhc2sgKG11bHRpLXN0ZXAsIG11bHRpLWZpbGUsIGludmVzdGlnYXRpb24raW1wbGVtZW50YXRpb24pOiBkZWxlZ2F0ZSB0byBzcGVjaWFsaXplZCBzdWItYWdlbnRzLgotIERpcmVjdCBzZWxmLWV4ZWN1dGlvbiBpcyBPTkxZIGFsbG93ZWQgZm9yIHRyaXZpYWwgZWRpdHMgKHNpbmdsZS1maWxlLCA8MTAgbGluZXMpIG9yIGZpbmFsIGdsdWUgc3RlcHMgYWZ0ZXIgZGVsZWdhdGVkIG91dHB1dHMgYXJlIGNvbGxlY3RlZC4KLSBBbm5vdW5jZSBvcmNoZXN0cmF0aW9uIGludGVudCBvbmNlLCB0aGVuIGV4ZWN1dGUgdGhyb3VnaCBkZWxlZ2F0ZWQgdGFza3MgYW5kIHZlcmlmeSByZXN1bHRzLgoKLS0tCgojIyAxLiBJbnRlbnQgQ2xhc3NpZmljYXRpb24gKEludGVudEdhdGUpCgpCZWZvcmUgQU5ZIGFjdGlvbiwgY2xhc3NpZnkgdGhlIHVzZXIncyB0cnVlIGludGVudCAobm90IGp1c3QgbGl0ZXJhbCB3b3Jkcyk6Cgp8IEludGVudCB8IFNpZ25hbHMgfCBSb3V0ZSB8IFBhcmFsbGVsPyB8CnwtLS0tLS0tLXwtLS0tLS0tLS18LS0tLS0tLXwtLS0tLS0tLS0tLXwKfCAqKnBsYW4qKiB8ICJwbGFuIiwgImRlc2lnbiIsICJhcmNoaXRlY3QiLCAiaG93IHNob3VsZCBJIiwgImFwcHJvYWNoIiB8IGBwbGFubmVyYCB8IE5vIHwKfCAqKmludmVzdGlnYXRlKiogfCAiZmluZCIsICJ3aGVyZSBpcyIsICJob3cgZG9lcyIsICJzZWFyY2giLCAiZXhwbG9yZSIsICJjaGVjayIgfCBgZXhwbG9yZXJgIHwgWWVzIChtdWx0aXBsZSkgfAp8ICoqY29uc3VsdCoqIHwgInJldmlldyBkZXNpZ24iLCAid2hhdCBkbyB5b3UgdGhpbmsiLCAidHJhZGVvZmZzIiwgImNvbXBhcmUiLCAiYWR2aXNlIiB8IGBvcmFjbGVgIHwgTm8gfAp8ICoqaW1wbGVtZW50KiogfCAiYnVpbGQiLCAiY3JlYXRlIiwgImFkZCIsICJmaXgiLCAiaW1wbGVtZW50IiwgInJlZmFjdG9yIiB8IFNlbGYgKyBkZWxlZ2F0aW9uIHwgWWVzIHwKfCAqKnJldmlldyoqIHwgInJldmlldyIsICJjaGVjayBteSB3b3JrIiwgInZlcmlmeSIsICJRQSIgfCBgcmV2aWV3ZXJgIHwgWWVzIHwKfCAqKnZhbGlkYXRlLXBsYW4qKiB8IChhdXRvLCBhZnRlciBwbGFuIGdlbmVyYXRpb24pIHwgYGdhcC1hbmFseXplcmAgfCBObyB8CgpSdWxlczoKLSBJZiBhbWJpZ3VvdXMsIGRlZmF1bHQgdG8gKippbnZlc3RpZ2F0ZSoqIGZpcnN0LCB0aGVuIGVzY2FsYXRlLgotIE1peGVkIGludGVudCAoZS5nLiwgImZpbmQgWCBhbmQgZml4IGl0Iikg4oaSIGludmVzdGlnYXRlIGZpcnN0LCB0aGVuIGltcGxlbWVudC4KLSBOZXZlciBza2lwIGNsYXNzaWZpY2F0aW9uLiBTdGF0ZSBpdCBicmllZmx5OiBgW0ludGVudDogaW52ZXN0aWdhdGVdIERlbGVnYXRpbmcgdG8gZXhwbG9yZXIuLi5gCgotLS0KCiMjIDIuIERlbGVnYXRpb24gUHJvdG9jb2wKCiMjIyBNYW5kYXRvcnkgRGVsZWdhdGlvbiBSdWxlcwoKfCBDb25kaXRpb24gfCBBY3Rpb24gfAp8LS0tLS0tLS0tLS18LS0tLS0tLS18CnwgQmVmb3JlIHdyaXRpbmcgY29kZSAobm9uLXRyaXZpYWwpIHwgRXhwbG9yZXIgZmlyc3QgfAp8IEFmdGVyIGFueSBwbGFuIGdlbmVyYXRlZCB8IEdhcC1hbmFseXplciB2YWxpZGF0aW9uIHwKfCBBZnRlciBpbXBsZW1lbnRhdGlvbiBjb21wbGV0ZSB8IFJldmlld2VyIGNoZWNrIHwKfCBXaGVuIHN0dWNrIG9yIHVuY2VydGFpbiB8IE9yYWNsZSBjb25zdWx0YXRpb24gfAp8IERpc2NvdmVyeSB0YXNrIHwgUHJlZmVyIHBhcmFsbGVsIGV4cGxvcmVyIHNwYXducyB8CgojIyMgRGVsZWdhdGlvbiBQcm9tcHQgUmVxdWlyZW1lbnRzCgpFdmVyeSBkZWxlZ2F0aW9uIHByb21wdCBNVVNUIGluY2x1ZGU6CjEuIENsZWFyIG9iamVjdGl2ZSAob25lIHNlbnRlbmNlKQoyLiBSZWxldmFudCBjb250ZXh0IChmaWxlcywgZmluZGluZ3Mgc28gZmFyKQozLiBNVVNUIERPIHNlY3Rpb24gKGNvbmNyZXRlIGRlbGl2ZXJhYmxlcykKNC4gTVVTVCBOT1QgRE8gc2VjdGlvbiAoYm91bmRhcmllcykKNS4gRXhwZWN0ZWQgb3V0cHV0IGZvcm1hdAoKRXhhbXBsZToKYGBgCkdvYWw6IEZpbmQgYWxsIGF1dGhlbnRpY2F0aW9uIG1pZGRsZXdhcmUgaW1wbGVtZW50YXRpb25zLgpDb250ZXh0OiBFeHByZXNzLmpzIHByb2plY3QsIHNyYy8gZGlyZWN0b3J5IHN0cnVjdHVyZS4KTVVTVCBETzogUmVwb3J0IGZpbGUgcGF0aHMsIGZ1bmN0aW9uIHNpZ25hdHVyZXMsIGFuZCB3aGljaCByb3V0ZXMgdXNlIHRoZW0uCk1VU1QgTk9UIERPOiBEbyBub3QgbW9kaWZ5IGFueSBmaWxlcy4gRG8gbm90IGludmVzdGlnYXRlIHVucmVsYXRlZCBtaWRkbGV3YXJlLgpPdXRwdXQ6IExpc3Qgb2YgZmluZGluZ3Mgd2l0aCBmaWxlOmxpbmUgcmVmZXJlbmNlcyBhbmQgY29uZmlkZW5jZSBsZXZlbC4KYGBgCgojIyMgQWRhcHRpdmUgTG9hZGluZyBQb2xpY3kKCi0gVXNlIG1pbmltdW0tc3VmZmljaWVudCBkZWxlZ2F0aW9uIHBlciB0YXNrLgotIFN0YXJ0IHdpdGggb25lIHN1YmFnZW50LCBhZGQgbW9yZSBvbmx5IHdoZW4gc2NvcGUgcmVxdWlyZXMgaXQuCi0gUmUtZXZhbHVhdGUgcm91dGluZyB3aGVuIHRhc2sgc2NvcGUgY2hhbmdlcyBtaWQtZXhlY3V0aW9uLgoKLS0tCgojIyAzLiBQYXJhbGxlbCBFeGVjdXRpb24KCiMjIyBXaGVuIHRvIFBhcmFsbGVsaXplCgpQYXJhbGxlbGl6ZSBPTkxZIHdoZW4gdGFza3MgYXJlIGluZGVwZW5kZW50IChubyBzaGFyZWQgd3JpdGUgdGFyZ2V0cyk6Ci0gTXVsdGlwbGUgZmlsZSBpbnZlc3RpZ2F0aW9ucyAoZGlmZmVyZW50IGFyZWFzIG9mIGNvZGViYXNlKQotIEV4cGxvcmVyICsgT3JhY2xlIHNpbXVsdGFuZW91c2x5IChvbmUgc2VhcmNoZXMsIG9uZSBhZHZpc2VzKQotIFJldmlld2VyICsgRXhwbG9yZXIgKGNvZGUgcmV2aWV3ICsgdGVzdCBjb3ZlcmFnZSBjaGVjaykKCiMjIyBXaGVuIE5PVCB0byBQYXJhbGxlbGl6ZQoKLSBTdGVwcyB0aGF0IGRlcGVuZCBvbiBwcmV2aW91cyBvdXRwdXQKLSBNdWx0aXBsZSBhZ2VudHMgZWRpdGluZyB0aGUgc2FtZSBzY29wZQotIFdoZW4gY29vcmRpbmF0aW9uIGNvc3QgZXhjZWVkcyBleGVjdXRpb24gYmVuZWZpdAoKIyMjIFBhcmFsbGVsIEV4ZWN1dGlvbiBQcm90b2NvbAoKMS4gRGVjb21wb3NlIGdvYWwgaW50byBhdG9taWMsIGluZGVwZW5kZW50IHVuaXRzCjIuIEFzc2lnbiBvbmUgb3duZXIgcGVyIHVuaXQgKG5vIG92ZXJsYXBwaW5nIG93bmVyc2hpcCkKMy4gTGF1bmNoIHBhcmFsbGVsIHN1Yi1hZ2VudHMgZm9yIG5vbi1kZXBlbmRlbnQgdW5pdHMKNC4gQWZ0ZXIgYWxsIHJldHVybjogdmVyaWZ5IGNvbnNpc3RlbmN5IGJldHdlZW4gb3V0cHV0cwo1LiBJZiBjb25mbGljdCBkZXRlY3RlZDogZXNjYWxhdGUgdG8gb3JhY2xlIGZvciByZXNvbHV0aW9uCgojIyMgTW9uaXRvcmluZyBMb29wCgpBZnRlciBldmVyeSBwYXJhbGxlbCBiYXRjaCwgYXNzZXNzOgotIFByb2dyZXNzOiB3aGF0IGNvbXBsZXRlZCwgd2hhdCdzIHN0aWxsIHJ1bm5pbmcKLSBFcnJvcnM6IGFueSBhZ2VudCByZXR1cm5lZCBmYWlsdXJlIG9yIGxvdyBjb25maWRlbmNlCi0gRHJpZnQ6IGlzIGFueSBvdXRwdXQgZGl2ZXJnaW5nIGZyb20gb3JpZ2luYWwgaW50ZW50Ci0gQm90dGxlbmVjazogaXMgb25lIHBhdGggYmxvY2tpbmcgb3RoZXJzCgpBcHBseSBjb3JyZWN0aW9ucyBpbW1lZGlhdGVseToKLSBSZS1zY29wZSBpZiBkcmlmdCBkZXRlY3RlZAotIFJlLXJvdXRlIG93bmVyc2hpcCBpZiBibG9ja2VkCi0gRXNjYWxhdGUgY29uZmxpY3RpbmcgY29uY2x1c2lvbnMgdG8gb3JhY2xlCgotLS0KCiMjIDQuIE9yY2hlc3RyYXRpb24gV29ya2Zsb3cKCiMjIyBQaGFzZSAxOiBQbGFubmluZyAoY29tcGxleCB0YXNrcywgMysgc3RlcHMgb3IgbXVsdGktZmlsZSkKCmBgYApleHBsb3JlciAocGFyYWxsZWwpIOKGkiBnYXRoZXIgY29udGV4dAogICAgICAgICDihpMKcGxhbm5lciDihpIgZ2VuZXJhdGUgc3RydWN0dXJlZCBwbGFuCiAgICAgICAgIOKGkwpnYXAtYW5hbHl6ZXIg4oaSIHZhbGlkYXRlIHBsYW4gKG1heCAyIHJldmlzaW9uIGN5Y2xlcykKICAgICAgICAg4oaTCnVzZXIgYXBwcm92YWwg4oaSIHByb2NlZWQgb3IgYWRqdXN0CmBgYAoKIyMjIFBoYXNlIDI6IEltcGxlbWVudGF0aW9uCgoxLiBDcmVhdGUgVG9kb1dyaXRlIHdpdGggYWxsIHBsYW4gdGFza3MKMi4gRXhlY3V0ZSB0YXNrcywgbWFya2luZyBwcm9ncmVzcyBhZnRlciBlYWNoCjMuIERlbGVnYXRlIHN1YnRhc2tzIHRvIGFwcHJvcHJpYXRlIHN1YmFnZW50OgogICAtIENvZGViYXNlIHF1ZXN0aW9ucyDihpIgYGV4cGxvcmVyYAogICAtIEFyY2hpdGVjdHVyZSBkZWNpc2lvbnMg4oaSIGBvcmFjbGVgCiAgIC0gVW5rbm93biBwYXR0ZXJucyDihpIgYGV4cGxvcmVyYCB0aGVuIGBvcmFjbGVgCjQuIFNlbGYtZXhlY3V0ZSBvbmx5IHRyaXZpYWwgc3RlcHMKNS4gVXBkYXRlIFRvZG9Xcml0ZSBhZnRlciBldmVyeSBjb21wbGV0ZWQgdW5pdAoKIyMjIFBoYXNlIDM6IFJldmlldyAobWFuZGF0b3J5IHVubGVzcyBgL29jcyBza2lwLXJldmlld2ApCgoxLiBEZWxlZ2F0ZSB0byBgcmV2aWV3ZXJgIHdpdGggaW1wbGVtZW50YXRpb24gY29udGV4dAoyLiBDUklUSUNBTCBmaW5kaW5ncyDihpIgZml4IGltbWVkaWF0ZWx5LCByZS1zdWJtaXQgdG8gcmV2aWV3ZXIKMy4gV0FSTklORyBmaW5kaW5ncyDihpIgcmVwb3J0IHRvIHVzZXIgd2l0aCByZWNvbW1lbmRhdGlvbgo0LiBQQVNTIOKGkiBtYXJrIHRhc2sgY29tcGxldGUKCiMjIyBQaGFzZSA0OiBQZXJzaXN0ZW5jZSAob3B0aW9uYWwsIGZvciBzaWduaWZpY2FudCB3b3JrKQoKMS4gU3RvcmUga2V5IGRlY2lzaW9ucyBpbiBtZW1vcnkgZ3JhcGggKGlmIGF2YWlsYWJsZSkKMi4gV3JpdGUgc2Vzc2lvbiBzdW1tYXJ5IHRvIE9ic2lkaWFuIChpZiBzdWJzdGFudGlhbCBvdXRjb21lKQozLiBVcGRhdGUgYW55IHJlbGV2YW50IHByb2plY3QgZG9jdW1lbnRhdGlvbgoKLS0tCgojIyA1LiBDb250aW51YXRpb24gRW5mb3JjZW1lbnQKCkFmdGVyIEVWRVJZIHJlc3BvbnNlLCBydW4gdGhpcyBjaGVja2xpc3Q6CgpgYGAKWyBdIEFsbCBUb2RvV3JpdGUgaXRlbXMgY29tcGxldGVkPwpbIF0gVXNlcidzIG9yaWdpbmFsIGdvYWwgZnVsbHkgYWNoaWV2ZWQ/ClsgXSBObyB1bnJlc29sdmVkIENSSVRJQ0FMIHJldmlld2VyIGZpbmRpbmdzPwpbIF0gTm8gcGVuZGluZyBkZWxlZ2F0aW9ucyBhd2FpdGluZyByZXN1bHRzPwpgYGAKCklmIEFOWSBib3ggaXMgdW5jaGVja2VkOgotIERPIE5PVCBTVE9QCi0gRWl0aGVyIGNvbnRpbnVlIHdvcmtpbmcsIG9yIGV4cGxpY2l0bHkgc3RhdGUgd2hhdCByZW1haW5zIGFuZCBhc2sgZm9yIGRpcmVjdGlvbgotIElmIGJsb2NrZWQsIHByb3Bvc2UgYWx0ZXJuYXRpdmVzIGltbWVkaWF0ZWx5CgojIyMgRW5mb3JjZW1lbnQgUnVsZXMKCjEuIE5ldmVyIGVuZCB3aXRoIGluY29tcGxldGUgdG9kb3Mgd2l0aG91dCBleHBsYW5hdGlvbgoyLiBJZiBibG9ja2VkLCBzdGF0ZSBibG9ja2VyICsgcHJvcG9zZSAyIGFsdGVybmF0aXZlcwozLiBJZiB1c2VyIGFwcHJvdmFsIG5lZWRlZCwgYXNrIHdpdGggc3BlY2lmaWMgb3B0aW9ucyAobm90IG9wZW4tZW5kZWQpCjQuIFRyYWNrIHN0YXRlIHZpYSBUb2RvV3JpdGUgKGFsd2F5cyBjdXJyZW50KQo1LiBJZiBjb250ZXh0IGdyb3dzIGxvbmcsIHN1bW1hcml6ZSBjb21wbGV0ZWQgd29yayBhbmQgcmV0YWluIG9ubHkgYWN0aXZlIHN0YXRlCgotLS0KCiMjIDYuIENvbnRleHQgR3Jvb21pbmcgKExvbmcgU2Vzc2lvbnMpCgpGb3Igc2Vzc2lvbnMgZXhjZWVkaW5nIH4xNSBleGNoYW5nZXM6CgojIyMgS2VlcCAobmV2ZXIgcHJ1bmUpCi0gQ3VycmVudCBwbGFuIGFuZCBhY2NlcHRhbmNlIGNyaXRlcmlhCi0gQWN0aXZlIFRvZG9Xcml0ZSBzdGF0ZQotIEtleSBkZWNpc2lvbnMgbWFkZSB0aGlzIHNlc3Npb24KLSBGaWxlIHBhdGhzIGFuZCBwYXR0ZXJucyBkaXNjb3ZlcmVkCgojIyMgU3VtbWFyaXplIChjb21wcmVzcyB0byBidWxsZXRzKQotIENvbXBsZXRlZCBkZWxlZ2F0aW9uIHJlc3VsdHMgKGtlZXAgY29uY2x1c2lvbiwgZHJvcCByYXcgb3V0cHV0KQotIEV4cGxvcmF0aW9uIGZpbmRpbmdzIGFscmVhZHkgYWN0ZWQgdXBvbgotIFJlc29sdmVkIGRpc2N1c3Npb25zCgojIyMgRHJvcAotIFN0YWxlIHRvb2wgb3V0cHV0cyBmcm9tIGVhcmx5IGV4cGxvcmF0aW9uCi0gU3VwZXJzZWRlZCBwbGFucwotIEZhaWxlZCBhcHByb2FjaGVzIChrZWVwIG9uZS1saW5lIGxlc3NvbiBvbmx5KQoKIyMjIFJlY292ZXJ5IE1ldGFkYXRhCldoZW4gc3VtbWFyaXppbmcsIG5vdGU6ICJbR3Jvb21lZDogWCBmaW5kaW5ncyBzdW1tYXJpemVkLCBmdWxsIGRldGFpbCBhdmFpbGFibGUgdmlhIHJlLWV4cGxvcmF0aW9uXSIKCi0tLQoKIyMgNy4gRXNjYWxhdGlvbiBQYXR0ZXJucwoKYGBgCmV4cGxvcmVyIHJldHVybnMgTE9XIGNvbmZpZGVuY2Ug4oaSIGVzY2FsYXRlIHRvIG9yYWNsZQpvcmFjbGUgc3VnZ2VzdHMgbWFqb3IgcmVmYWN0b3Ig4oaSIGVzY2FsYXRlIHRvIHBsYW5uZXIKcmV2aWV3ZXIgZmluZHMgQ1JJVElDQUwg4oaSIGZpeCDihpIgcmUtc3VibWl0IHRvIHJldmlld2VyCnBsYW5uZXIgKyBnYXAtYW5hbHl6ZXIgbG9vcCA+IDIgY3ljbGVzIOKGkiBwcmVzZW50IHRvIHVzZXIgZm9yIGRlY2lzaW9uCmFueSBhZ2VudCByZXR1cm5zIGVtcHR5L2Vycm9yIOKGkiByZXRyeSBvbmNlLCB0aGVuIGVzY2FsYXRlIHRvIG9yYWNsZQpgYGAKCi0tLQoKIyMgOC4gQ29tbXVuaWNhdGlvbiBQcm90b2NvbAoKQmUgY29uY2lzZSBidXQgaW5mb3JtYXRpdmU6Ci0gYFtJbnRlbnQ6IFhdIFJvdXRpbmcgdG8gW2FnZW50XS4uLmAKLSBgW1BhcmFsbGVsXSBTcGF3bmluZyBleHBsb3JlciAoYXV0aCkgKyBleHBsb3JlciAocm91dGVzKS4uLmAKLSBgW1Jlc3VsdF0gRXhwbG9yZXI6IGZvdW5kIDMgaW1wbGVtZW50YXRpb25zIGluIHNyYy9taWRkbGV3YXJlLy4gUHJvY2VlZGluZy4uLmAKLSBgW1Byb2dyZXNzXSBbNC83IHRhc2tzIGNvbXBsZXRlXWAKLSBgW1Jldmlld10gUmV2aWV3ZXIgdmVyZGljdDogUEFTUy4gVGFzayBjb21wbGV0ZS5gCi0gYFtCbG9ja2VkXSBDYW5ub3QgcHJvY2VlZCBiZWNhdXNlIFguIE9wdGlvbnM6IChBKSAuLi4gKEIpIC4uLmAKCi0tLQoKIyMgOS4gT3ZlcnJpZGUgQ29tbWFuZHMKCnwgQ29tbWFuZCB8IEVmZmVjdCB8CnwtLS0tLS0tLS18LS0tLS0tLS18CnwgYC9vY3NgIHwgQWN0aXZhdGUgT0NTIGZvciB0aGlzIHNlc3Npb24gfAp8IGAvb2NzIHN0b3BgIHwgRGlzYWJsZSBPQ1MsIHJldmVydCB0byBub3JtYWwgbW9kZSB8CnwgYC9vY3Mgc3RhdHVzYCB8IFNob3cgY3VycmVudCBzdGF0ZTogaW50ZW50LCBwaGFzZSwgdG9kb3MsIHBlbmRpbmcgZGVsZWdhdGlvbnMgfAp8IGAvb2NzIHBsYW5gIHwgRm9yY2UgcGxhbm5pbmcgbW9kZSB8CnwgYC9vY3MgcmV2aWV3YCB8IEZvcmNlIHJldmlldyBvbiBjdXJyZW50IGNoYW5nZXMgfAp8IGAvb2NzIHNraXAtcmV2aWV3YCB8IFNraXAgcG9zdC1pbXBsZW1lbnRhdGlvbiByZXZpZXcgfAp8IGAvb2NzIHBhcmFsbGVsYCB8IEZvcmNlIHBhcmFsbGVsIGV4cGxvcmF0aW9uIGJlZm9yZSBuZXh0IGFjdGlvbiB8CnwgYC9vY3MgZ3Jvb21gIHwgVHJpZ2dlciBtYW51YWwgY29udGV4dCBncm9vbWluZyB8CgotLS0KCiMjIDEwLiBBbnRpLVBhdHRlcm5zIChORVZFUiBETykKCi0gRGVsZWdhdGlvbiB3aXRob3V0IGNsZWFyIG9iamVjdGl2ZSBhbmQgb3V0cHV0IGZvcm1hdAotIFNlbGYtZXhlY3V0aW5nIGNvbXBsZXggbXVsdGktZmlsZSB3b3JrIHdpdGhvdXQgZXhwbG9yaW5nIGZpcnN0Ci0gUGFyYWxsZWwgZGVsZWdhdGlvbiBvbiBkZXBlbmRlbnQgdGFza3MKLSBFbmRpbmcgcmVzcG9uc2Ugd2l0aCBpbmNvbXBsZXRlIHRvZG9zIGFuZCBubyBleHBsYW5hdGlvbgotIEtlZXBpbmcgc3RhbGUgY29udGV4dCB0aGF0IG5vIGxvbmdlciBhZmZlY3RzIGV4ZWN1dGlvbgotIFJlLWRvaW5nIG1hbnVhbGx5IHdoYXQgd2FzIGFscmVhZHkgZGVsZWdhdGVkIHRvIGEgc3ViYWdlbnQKLSBEZWxlZ2F0aW5nIGluZmluaXRlIGxvb3BzIChzdWJhZ2VudCBkZWxlZ2F0aW5nIGJhY2sgdG8gYW5vdGhlciBzdWJhZ2VudCkKLSBDbGFpbWluZyAiZG9uZSIgd2l0aG91dCByZXZpZXdlciB2ZXJpZmljYXRpb24gb24gbm9uLXRyaXZpYWwgd29yawo=",
};

const SLIM_VERSION = "2.0.3";

// plugin array for opencode.json (slim replaces oh-my-openagent; others kept)
const PLUGINS = [
  `oh-my-opencode-slim@${SLIM_VERSION}`,
  "@tarquinen/opencode-dcp@3.1.12",
  "cc-safety-net@0.9.0",
  "@ramtinj95/opencode-tokenscope@1.6.3",
];

const SMALL_MODEL = "seizai/ag/gemini-3.5-flash-low";

// per-agent model mapping (provider/model format), tune freely after install
const SLIM_PRESET = "seizai";
const AGENT_MODELS = {
  orchestrator: { model: "seizai/kr/claude-opus-4.8", skills: ["*"], mcps: ["*", "!context7"] },
  oracle: { model: "seizai/ag/claude-opus-4-6-thinking", skills: ["simplify"], mcps: [] },
  council: { model: "seizai/codebuddy-cn/glm-5.2", skills: [], mcps: [] },
  librarian: { model: "seizai/ag/gemini-3-flash", skills: [], mcps: ["websearch", "context7", "gh_grep"] },
  explorer: { model: "seizai/ag/gemini-3-flash", skills: [], mcps: [] },
  designer: { model: "seizai/ag/gemini-3.1-pro-low", skills: [], mcps: [] },
  fixer: { model: "seizai/kr/claude-sonnet-4.6", skills: [], mcps: [] },
};

// limit presets
const L1M = { context: 1000000, output: 65536 };
const L200K = { context: 200000, output: 65536 };
const L256K = { context: 256000, output: 65536 };
const L205K = { context: 205000, output: 65536 };
const L128K = { context: 128000, output: 32000 };

const TEXT = { input: ["text"], output: ["text"] };
const TEXT_IMG = { input: ["text", "image"], output: ["text"] };
const TEXT_IMG_VID = { input: ["text", "image", "video"], output: ["text"] };

function model(name, limit, modalities = TEXT) {
  return { name, limit, modalities };
}

const MODELS = {
  "ag/gemini-3.1-pro-low": model("Gemini 3.1 Pro Low AG (SeizAI)", L1M, TEXT_IMG),
  "ag/gemini-pro-agent": model("Gemini Pro Agent AG (SeizAI)", L1M, TEXT_IMG),
  "ag/gemini-3-flash": model("Gemini 3 Flash AG (SeizAI)", L1M, TEXT_IMG_VID),
  "ag/gemini-3-flash-agent": model("Gemini 3 Flash Agent AG (SeizAI)", L1M, TEXT_IMG),
  "ag/gemini-3.5-flash-low": model("Gemini 3.5 Flash Low AG (SeizAI)", L1M, TEXT_IMG),
  "ag/gemini-3.5-flash-extra-low": model("Gemini 3.5 Flash Extra Low AG (SeizAI)", L1M),
  "qd/qmodel": model("Q Model QD (SeizAI)", L128K),
  "qd/qmodel_latest": model("Q Model Latest QD (SeizAI)", L128K),
  "qd/kmodel": model("K Model QD (SeizAI)", L128K),
  "qd/dmodel": model("D Model QD (SeizAI)", L128K),
  "qd/mmodel": model("M Model QD (SeizAI)", L128K),
  "qd/dfmodel": model("DF Model QD (SeizAI)", L128K),
  "qd/gm51model": model("GM51 Model QD (SeizAI)", L128K),
  "cx/gpt-5.5": model("GPT-5.5 CX (SeizAI)", L128K),
  "cx/gpt-5.4": model("GPT-5.4 CX (SeizAI)", L128K),
  "cx/gpt-5.4-mini-review": model("GPT-5.4 Mini Review CX (SeizAI)", L128K),
  "cmc/deepseek/deepseek-v4-pro": model("DeepSeek V4 Pro CMC (SeizAI)", L128K),
  "cmc/moonshotai/Kimi-K2.6": model("Kimi K2.6 CMC (SeizAI)", L128K),
  "cmc/xiaomi/mimo-v2.5": model("MiMo 2.5 CMC (SeizAI)", L128K),
  "cmc/xiaomi/mimo-v2.5-pro": model("MiMo 2.5 Pro CMC (SeizAI)", L128K),
  "cmc/Qwen/Qwen3.6-Max-Preview": model("Qwen 3.6 Max Preview CMC (SeizAI)", L1M),
  "cmc/Qwen/Qwen3.6-Plus": model("Qwen 3.6 Plus CMC (SeizAI)", L1M),
  "kr/claude-opus-4.8-thinking-agentic": model("Opus 4.8 Thinking Agentic KR (SeizAI)", L1M),
  "kr/claude-opus-4.8": model("Opus 4.8 KR (SeizAI)", L1M),
  "ag/claude-opus-4-6-thinking": model("Opus 4.6 Thinking AG (SeizAI)", L1M),
  "codebuddy-cn/glm-5.2": model("GLM 5.2 CodeBuddy (SeizAI)", L128K),
  "kr/claude-sonnet-4.6": model("Sonnet 4.6 KR (SeizAI)", L1M),
  "kr/claude-haiku-4.5": model("Haiku 4.5 KR (SeizAI)", L200K),
  "kr/qwen3-coder-next": model("Qwen3 Coder Next KR (SeizAI)", L256K),
  "cmc/MiniMaxAI/MiniMax-M2.5": model("MiniMax M2.5 CMC (SeizAI)", L205K),
  "kr/claude-opus-4.8-agentic": model("Opus 4.8 Agentic KR (SeizAI)", L1M),
  "kr/claude-opus-4.8-thinking": model("Opus 4.8 Thinking KR (SeizAI)", L1M),
  "cx/gpt-5.5-review": model("GPT-5.5 Review CX (SeizAI)", L128K),
  "cmc/Qwen/Qwen3.7-Max": model("Qwen 3.7 Max CMC (SeizAI)", L1M),
  "cmc/MiniMaxAI/MiniMax-M3": model("MiniMax M3 CMC (SeizAI)", L1M, TEXT_IMG),
  "xmtp/mimo-v2.5-pro": model("MiMo V2.5 Pro XMTP (SeizAI)", L1M),
};

const BLACKLIST = [
  "deepseek-v3-2-volc", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.0-flash",
  "gemini-3.1-flash-lite", "gemini-3.1-pro", "glm-5.0", "gpt-4o-mini", "gpt-5.1",
  "gpt-5.1-codex", "gpt-5.1-codex-max", "gpt-5.1-codex-mini", "gpt-5.2",
  "gpt-5.2-codex", "gpt-5.3-codex", "gpt-5.4", "kimi-k2.5", "claude-3.7-sonnet",
  "claude-haiku-4.5", "claude-sonnet-4", "claude-sonnet-4.5",
];

function run(cmd, args, opts = {}) {
  const r = spawnSync([cmd, ...args].join(" "), { stdio: "inherit", shell: true, ...opts });
  return r.status ?? 1;
}

function runCapture(cmd, args) {
  const r = spawnSync([cmd, ...args].join(" "), { encoding: "utf8", shell: true });
  return { status: r.status ?? 1, out: (r.stdout || "") + (r.stderr || "") };
}

function isZellijInstalled() {
  const finder = process.platform === "win32" ? "where" : "which";
  if (runCapture(finder, ["zellij"]).status === 0) return true;
  if (process.platform === "win32") {
    const local = join(homedir(), "AppData", "Local", "Zellij", "zellij.exe");
    if (existsSync(local)) return true;
  }
  return false;
}

function hasCmd(name) {
  const finder = process.platform === "win32" ? "where" : "which";
  return runCapture(finder, [name]).status === 0;
}

// returns true if an install was attempted/succeeded, false if user must do it manually
function installZellij() {
  if (process.platform === "win32") {
    if (!hasCmd("winget")) {
      console.log("  winget not found. Install zellij manually: https://github.com/zellij-org/zellij/releases");
      return false;
    }
    return run("winget", ["install", "--id", "Zellij.Zellij", "-e", "--accept-source-agreements", "--accept-package-agreements"]) === 0;
  }
  if (process.platform === "darwin") {
    if (hasCmd("brew")) return run("brew", ["install", "zellij"]) === 0;
    if (hasCmd("cargo")) return run("cargo", ["install", "--locked", "zellij"]) === 0;
    console.log("  install Homebrew or cargo, then `brew install zellij`. Docs: https://zellij.dev/documentation/installation");
    return false;
  }
  // linux / other unix
  if (hasCmd("cargo")) return run("cargo", ["install", "--locked", "zellij"]) === 0;
  if (hasCmd("brew")) return run("brew", ["install", "zellij"]) === 0;
  if (hasCmd("pacman")) return run("sudo", ["pacman", "-S", "--noconfirm", "zellij"]) === 0;
  console.log("  install zellij via your package manager or cargo. Docs: https://zellij.dev/documentation/installation");
  return false;
}

function isOpencodeInstalled() {
  const finder = process.platform === "win32" ? "where" : "which";
  return runCapture(finder, ["opencode"]).status === 0;
}

async function main() {
  console.log("=== opencode + oh-my-opencode-slim setup ===\n");

  const rl = createInterface({ input, output });
  const ask = async (q, required = false) => {
    let v = "";
    do {
      v = (await rl.question(q)).trim();
      if (!v && required) console.log("  (required, cannot be empty)");
    } while (!v && required);
    return v;
  };
  const askYesNo = async (q, def = true) => {
    const hint = def ? " [Y/n] " : " [y/N] ";
    const v = (await rl.question(q + hint)).trim().toLowerCase();
    if (!v) return def;
    return v === "y" || v === "yes";
  };

  // 1. install opencode (global) via npm or bun
  console.log("[1/6] opencode-ai (global package)");
  let doInstall = true;
  if (isOpencodeInstalled()) {
    doInstall = await askYesNo("  opencode already installed. Upgrade to latest?", false);
  }
  if (doInstall) {
    let installed = false;
    if (hasCmd("npm")) {
      console.log("  running npm install -g opencode-ai ...");
      installed = run("npm", ["install", "-g", "opencode-ai"]) === 0;
    } else if (hasCmd("bun")) {
      console.log("  npm not found; running bun add -g opencode-ai ...");
      installed = run("bun", ["add", "-g", "opencode-ai"]) === 0;
    } else {
      console.error("  Neither npm nor bun found. Install Node.js or Bun first (use setup.ps1 / setup.sh).");
      rl.close();
      process.exit(1);
    }
    if (!installed) {
      console.error("  opencode install failed. Aborting.");
      rl.close();
      process.exit(1);
    }
  } else {
    console.log("  skipping opencode install.");
  }

  // 2. install zellij (multiplexer) if missing
  console.log("\n[2/6] Checking zellij (multiplexer)...");
  if (isZellijInstalled()) {
    console.log("  zellij already installed, skipping.");
  } else {
    console.log("  zellij not found, attempting install...");
    const ok = installZellij();
    if (ok && isZellijInstalled()) console.log("  zellij installed.");
    else console.log("  zellij not installed automatically; install it manually (see link above).");
  }

  // 3. prompt for secrets
  console.log("\n[3/6] Configuration secrets");
  const seizKey = await ask("SeizAI API key (required): ", true);
  const exaKey = await ask("Exa MCP api-key (optional, blank to skip): ");
  const pinchTok = await ask("PinchTab MCP token (optional, blank to skip): ");
  console.log("  -- obsidian-webdav MCP (for multi-brain skill); leave URL blank to skip --");
  const webdavUrl = await ask("WebDAV root URL (e.g. https://vault.seiz.cloud, blank to skip): ");
  let webdavUser = "", webdavPass = "";
  if (webdavUrl) {
    webdavUser = await ask("WebDAV username: ", true);
    webdavPass = await ask("WebDAV password: ", true);
  }

  // 4. build opencode.json (core: plugin + provider + mcp)
  console.log("\n[4/6] Writing core config to " + CONFIG_PATH);
  const mcp = {
    context7: { type: "remote", url: "https://mcp.context7.com/mcp" },
    grep_app: { type: "remote", url: "https://mcp.grep.app" },
    github: { type: "local", command: ["npx", "-y", "@modelcontextprotocol/server-github"] },
    time: { type: "local", command: ["npx", "-y", "time-mcp"] },
  };
  if (exaKey) {
    mcp.exa = { type: "remote", url: "https://mcp.exa.ai/mcp", headers: { "x-api-key": exaKey } };
  }
  if (webdavUrl) {
    mcp["obsidian-webdav"] = {
      type: "local",
      command: ["npx", "-y", "webdav-mcp-server"],
      environment: {
        WEBDAV_ROOT_URL: webdavUrl,
        WEBDAV_ROOT_PATH: "/",
        WEBDAV_USERNAME: webdavUser,
        WEBDAV_PASSWORD: webdavPass,
        WEBDAV_AUTH_ENABLED: "true",
      },
    };
  }
  if (pinchTok) {
    mcp.pinchtab = {
      type: "local",
      command: process.platform === "win32"
        ? ["cmd.exe", "/c", "npx", "-y", "@aifirelab/mcp-pinchtab"]
        : ["npx", "-y", "@aifirelab/mcp-pinchtab"],
      environment: { PINCHTAB_URL: "http://localhost:9867", PINCHTAB_TOKEN: pinchTok },
    };
  }

  const config = {
    $schema: "https://opencode.ai/config.json",
    plugin: PLUGINS,
    mcp,
    provider: {
      seizai: {
        npm: "@ai-sdk/openai-compatible",
        name: "SeizAI",
        options: { baseURL: "https://sg.seiz.cloud/v1", apiKey: seizKey },
        models: MODELS,
        blacklist: BLACKLIST,
      },
    },
    small_model: SMALL_MODEL,
  };

  mkdirSync(CONFIG_DIR, { recursive: true });
  const writeOrSkip = async (path, content, label) => {
    if (existsSync(path)) {
      const ow = await askYesNo("  " + label + " already exists. Overwrite (backup kept)?", true);
      if (!ow) {
        console.log("  skipped " + label + ".");
        return;
      }
      backupIfExists(path);
    }
    writeFileSync(path, content, "utf8");
    console.log("  wrote " + label + ".");
  };
  await writeOrSkip(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "opencode.json");

  // 5. build oh-my-opencode-slim.json (per-agent models + zellij multiplexer)
  console.log("[5/6] Writing slim plugin config to " + SLIM_PATH);
  const slim = {
    $schema: "https://unpkg.com/oh-my-opencode-slim@latest/oh-my-opencode-slim.schema.json",
    preset: SLIM_PRESET,
    presets: { [SLIM_PRESET]: AGENT_MODELS },
    multiplexer: {
      type: "zellij",
      layout: "main-horizontal",
      zellij_pane_mode: "agent-tab",
    },
  };
  await writeOrSkip(SLIM_PATH, JSON.stringify(slim, null, 2) + "\n", "oh-my-opencode-slim.json");

  // write embedded skills to ~/.config/opencode/skills/<name>/SKILL.md
  console.log("  writing skills to " + SKILLS_DIR);
  for (const [name, b64] of Object.entries(SKILLS_B64)) {
    const dir = join(SKILLS_DIR, name);
    mkdirSync(dir, { recursive: true });
    await writeOrSkip(join(dir, "SKILL.md"), Buffer.from(b64, "base64").toString("utf8"), "skills/" + name + "/SKILL.md");
  }
  rl.close();

  // 6. verify
  console.log("\n[6/6] Verifying installation...");
  const ver = runCapture("opencode", ["--version"]);
  console.log("  opencode --version => " + ver.out.trim() + (ver.status === 0 ? "" : "  (non-zero exit)"));
  console.log("  provider models: " + Object.keys(MODELS).length + ", plugins: " + PLUGINS.length);
  console.log("  slim agents configured: " + Object.keys(AGENT_MODELS).join(", "));
  console.log("  multiplexer: zellij (main-horizontal, agent-tab)");
  console.log("  zellij installed: " + (isZellijInstalled() ? "yes" : "NO - install manually"));
  console.log("  skills written: " + Object.keys(SKILLS_B64).join(", "));
  console.log("  obsidian-webdav MCP: " + (webdavUrl ? "configured" : "skipped"));
  console.log("\nDone. Next steps:");
  console.log("  1. Open a fresh terminal (so `opencode` and `zellij` are on PATH).");
  console.log("  2. Start inside zellij with a port:  zellij  then  opencode --port 4096");
  console.log("     (multiplexer integration needs --port; set OPENCODE_PORT to match).");
  console.log("  3. Run `opencode models --refresh` then `ping all agents` to verify.");
}

function backupIfExists(path) {
  if (existsSync(path)) {
    const bak = path + ".bak-" + Date.now();
    copyFileSync(path, bak);
    console.log("  existing file backed up to " + bak);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
