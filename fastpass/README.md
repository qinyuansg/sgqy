# AGIL® Secure FastPass — product site

A single-page, responsive marketing and demo site for **AGIL® Secure FastPass**: one verified identity, from kerb to gate.

Content is taken from the In.Vent mock pitch (02 Nov), the Innosuite 16:9 poster, the In.Vent A1 poster and the secondary-research notes. Brand colours (navy `#0A1730` and mint `#22E3A6`) and product imagery come from the same material.

## What's on the page

| Section | What it does |
|---|---|
| Hero | Value statement over the biometric-lane concept visualisation |
| Challenge | Four separate checkpoints today, plus three market stats with sources |
| Journey | Interactive kerb-to-gate explorer: 6 touchpoints on the isometric terminal map (tabs, hotspots, ← → keys, autoplay) |
| Try the app | Phone simulator of the FastPass Mobile App: passport scan → selfie/liveness → on-device credential → BLE lane pairing → e-gate "Cleared" → pre-screen → boarding |
| Platform | Simulated AGIL® Secure (ISMP) command console: live passenger log, KPIs, lane queues, exceptions you can clear or refer to an officer, and a flow chart. Also covers the AI loop (Report → Recommend → React → Predict) |
| Products | Mobile App, Biometric E-Gate, Nova Plus Reader, Smart Boarding Kiosk |
| Value | Animated "Today vs With FastPass" run, credential + face = cleared, benefits for travellers and operators |
| Market | TAM → SAM → SOM, with sources and estimates labelled as such |
| Roadmap | 2027 Prove → 2031 Scale, plus the Pilot → Portfolio commercial tiers |
| Request a pilot | Validated contact form (client-side only, see below) |

## Run it

No build step and no dependencies:

```bash
python3 -m http.server 8000     # from the repo root
# open http://localhost:8000/fastpass/
```

On GitHub Pages it is served at `/fastpass/`.

## Honest limitations (by design)

- **All live data is simulated.** The console feed, traveller names and the phone demo use specimen data. The demo doesn't use the camera and stores nothing.
- **The pilot form has no backend.** It validates the input and builds a summary for the visitor to copy. To collect submissions, point the form at a form service or your CRM endpoint in `js/fastpass.js` (the `submit` handler).
- **Figures.** The global market figures are from MarketsandMarkets (rounded). Regional share, capture, SOM, brownfield share and the 20–30% kerb-to-gate time saving are pitch team estimates, and the page labels them that way. Profitability numbers were left out because the pitch still has placeholders (`US$XXk`).
- The product imagery and terminal layout are concept visualisations, as the posters note.

## Files

```
fastpass/
  index.html          page markup
  css/fastpass.css    styles (responsive, honours prefers-reduced-motion)
  js/fastpass.js      journey explorer, app simulator, console, form
  assets/             optimised images from the pitch and poster
```
