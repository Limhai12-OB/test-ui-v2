# FinanceSight (LuyFlow) — UI demo

A front-end prototype of the FinanceSight / LuyFlow business finance app, built from the LIMHAI_PP Figma file. There is **no backend**: sign-in, data and AI answers are mocked in `src/lib/mock/`, and changes are kept in your browser.

## Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. It redirects to the sign-in page.

## Test accounts

| Role | Email | Password | What you see |
| --- | --- | --- | --- |
| **Business Owner** | `sokha@mekongmart.com.kh` | `Mekong2026` | Everything, all 4 branches (Sokha Chan) |
| **Branch Manager** | `dara@mekongmart.com.kh` | `Mekong2026` | Toul Kork Branch only; owner-only screens are locked (Dara Sok) |

- **Continue with Google** signs in as the Business Owner (no Google account needed).
- Any other email, or a wrong password, shows the "incorrect email or password" error. After **5** failed attempts sign-in is paused, as in the design.

## Codes and links

| Flow | How to test |
| --- | --- |
| **Verification code** (sign-up email check, forgot password) | `482017` — any other code is rejected |
| **Forgot password → new password** | Any email, code `482017`, then a new password. `Mekong2026` is rejected as "same as your last password" |
| **Sign up a new business** | Any name and an email that is **not** one of the two above, then code `482017`. You land in business setup and then the first-run dashboard (empty data) |
| **Branch Manager invitation** | `/invitation?token=demo` (valid, Chanthy Pov · Siem Reap) |
| **Expired invitation** | `/invitation?token=expired` |

## Review shortcuts

Some screens have states that are hard to reach by clicking. These URLs pin them:

| URL | Shows |
| --- | --- |
| `/dashboard?state=loading` | Dashboard loading skeleton (05.4) |
| `/dashboard?state=empty` | First-run dashboard (05.5) |
| `/ai-advisor?state=working` | AI Advisor working on an answer (11.7) |
| `/ai-advisor?state=error` | Answer could not be completed (11.8) |
| `/monthly-reports?generate=1` | Generate report dialog (12.3) |
| `/monthly-reports/2026-10?export=1` | Export PDF dialog (12.9) |
| `/data-import/new?state=failed` | File could not be read (16.12) |

**Things worth trying**

- **AI Advisor** — ask in English or Khmer, e.g. *"Which invoices are overdue?"*, *"ខែនេះអាជីវកម្មរបស់ខ្ញុំចំណេញប៉ុន្មាន?"*, or a change request like *"Mark INV-2026-0142 as paid"* (it refuses: read-only). As the Branch Manager, ask about another branch.
- **Monthly Reports** — October starts *not generated*: generate it (≈ 9 s), then export a real PDF.
- **Scan receipt** (`/scan`, or the round button in the phone bottom bar) — uses your camera if there is one; otherwise the sample receipt is shown, so just press the shutter. Saving creates a real expense. Switch to *Payment slip* (`/scan?mode=slip`) as the owner to record the ABA transfer against INV-2026-0142.
- **Forecasting** (owner only) — switch 1 / 3 / 6 months, then open *What-if*: add staff, change prices or plan a purchase and watch profit and cash move; *Save as target budget* keeps the plan.
- **Data Import** — *New import → Expenses → Use sample file* walks through all 11 steps; the 197 expenses really appear in Financial Records → Transactions, and *Undo this import* removes them. Upload a password-protected `.xlsx` to see the failure screen.

## Look and feel

- **Dark mode** — the sun/moon button in the top bar switches themes (it remembers your choice and follows your system setting until you pick one).
- **Search** — press **Ctrl / ⌘ + K** anywhere, or click the search box, to jump to any page, invoice, customer, bill, item or account.
- Several components come from [Hairline UI](https://hairlineui.com/ui) (MIT): the command palette, theme toggle, rolling numbers, dashboard chart, sparklines, AI thinking indicator and FAQ accordion. See `src/components/hairline/README.md`.

## Resetting the demo

Data lives in your browser (localStorage / sessionStorage). To start over, sign out and clear site data for `localhost:3000` (DevTools → Application → Storage → *Clear site data*), or use a private window.

## Not built yet

Every screen in the sidebar is built. The dark theme follows the section 20 direction but was not compared frame by frame (that section's export in LIMHAI_PP.zip is blank).
# test-ui-v2
