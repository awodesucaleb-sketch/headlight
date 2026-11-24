# Head Light Lab

An interactive 3D head for studying how light shapes a face: add and tune lights, move the camera, rotate the head, export images.

## Structure
- `index.html`, `css/styles.css`, `js/app.js`: the app
- `assets/asaro-head.glb`: the head model (see NOTICE.md)
- `sw.js`, `manifest.webmanifest`, `icons/`: offline support and installability
- `lib/`: three.js files, filled by `npm run vendor`
- `scripts/`: build helpers; `.github/workflows/pages.yml`: deploys to GitHub Pages

## Run locally
    npm install
    npm start

## Deploy
Push to a GitHub repository, then Settings > Pages > Source: **GitHub Actions**. Each push to `main` builds and publishes it.

## Updating
Change `CACHE` in `sw.js` (for example v5 to v6) with each release so installed copies refresh.
