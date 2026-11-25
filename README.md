# CardSheet — Freeform Image Placer, Cropper & Sheet Builder

A lightweight, privacy-first single-page web app (`index.html`, `styles.css`, `app.js`) that lets you upload or capture images, straighten/crop tilted edges, resize, and freely place them anywhere on a customizable sheet or paper size — completely locally in your browser.

## Features

- **Freeform Placement & Resize on Canvas**: Drag any image anywhere on the canvas (overlapping, diagonal, or spaced however you want), resize directly via corner/edge handles (with optional smart snap alignment guides), change layer order (`↑ Bring Front` / `↓ Send Back`), adjust opacity, or add extra image layers (`+ Add Image`).
- **Upload, Drag & Drop, Paste, or Camera Capture**: Load images from files, drag-and-drop, clipboard (`Ctrl`/`Cmd`+`V`), live webcam (`getUserMedia` with front/rear camera toggle), or native mobile camera (`Device Cam`).
- **4-Corner Straighten, Crop & Resize Crop**: Drag each corner (`TL`, `TR`, `BR`, `BL`) or edge point independently to straighten tilted cards/documents, or use Rectangle crop with aspect ratio presets (`Free`, `3:4`, `4:3`, `1:1`, `2:3`, `3:2`, `16:9`, `9:16`, `ID Card`), live `2.5×` zoom loupe, and crop resize (`Keep Cropped Size`, `Scale %`, or `Custom px`).
- **Paper Sizes, Print DPI & Optional Helpers**: Choose print paper sizes (**A4**, **A5**, **A3**, **US Letter**, **US Legal**, **4×6" Photo**, **5×7" Photo**) with **Portrait / Landscape** orientation and **300 / 150 / 96 DPI**, or screen presets (`4:3`, `3:4`, `1:1`, `16:9`, `Auto-Fit`, `Custom px`). Includes a one-click **Real ID Size (`85.6 × 54 mm`)** helper and exact `@page` print/PDF sizing.

## Host on GitHub Pages (Personal Use)

1. Create a GitHub repository and push `index.html`, `styles.css`, `app.js`, and `README.md`.
2. Go to **Settings → Pages** in your repository.
3. Under **Build and deployment**, select **Deploy from a branch**, pick `master` and `/ (root)`, then click **Save**.
4. Open the generated `https://punnamanikumar.github.io/CardSheet/` URL on desktop or mobile (HTTPS enables live camera capture automatically).
