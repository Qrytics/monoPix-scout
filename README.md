# monoPix-scout — Tracking Pixel Chrome Extension

An image/vision-analysis tool for detecting and visualising pixel-level changes across video frames using a “MonoPix”-inspired model. Discovers and reveals hidden imagery and tracking assets loaded on the webpages you visit. See what sites are pulling in the background — even when content is invisible or masked by CSS. Developed by Qrytics & TechnicalDree. This repository contains the full implementation, a seeded test page with sample data, evaluation scripts, and supporting modules.

## Getting Started
1. Clone: `git clone https://github.com/Qrytics/monoPix-scout.git`

2. Visit: `chrome://extensions/`

3. Enable Developer mode (top-right switch)

4. Click Load unpacked

5. Select the downloaded project folder

6. The extension icon (three vertical RGB bars) will appear in your Chrome bar.

## How to Use

1. Open any website

2. Click the MonoPix-Scout icon in the top-right

3. View tracked / hidden images and sources

4. Optionally change the site mode

All scanning is local — nothing is uploaded anywhere.

## Project Structure
    monoPix-scout/
    ├── manifest.json         # Chrome extension metadata
    ├── popup.html            # Main UI panel
    ├── popup.js              # Popup script (fetch + render results)
    ├── background.js         # Tracking + message passing
    ├── content-script.js     # Page scanner (detects hidden assets)
    ├── icons/                # Toolbar icon assets
    └── styles/               # UI styling (CSS)

## Roadmap / Ideas

- Better severity scoring (tracking reputation DB)

- Grouping by domain + tracker category

- Light/Dark theme

- Export report (CSV / JSON)

## Contributing

Contributions are welcome! If you spot a bug, need a new feature, or want to improve performance, please open an issue or pull request. When submitting changes, please keep them focused (one change per PR), include a short description of the change, and ideally provide a small test or sample.

## Credits

Authors: Qrytics, TechnicalDree
