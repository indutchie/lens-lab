# The Plane of Focus — Interactive 3D Optical Bench & Camera Lens Lab

[![Built with Three.js](https://img.shields.io/badge/Three.js-r186-black?style=flat-square&logo=three.js)](https://threejs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

> *"Everyone knows out-of-focus is blurry. Almost nobody knows why. Focus isn't a zone — it's a razor-thin 2D plane."*

**The Plane of Focus** is a physics-based, interactive 3D WebGL optical bench that visualizes photographic optics from first principles. Watch dynamic light rays bend through floating spherical glass elements and an adjustable 9-blade mechanical iris to form an inverted image on a ground-glass sensor.

---

## 🌟 Key Features

- **3D Multi-Element Lens Assembly**:
  - 5 bulged spherical optical glass elements procedurally lathed with dispersion, transmission, and thickness.
  - Knurled focus helicoid barrel with 60 mechanical ribs and golden-brown bronze gear rings.
  - One-click toggle between **Assembled** and **Exploded** element views.
- **Physical 9-Blade Aperture Iris**:
  - Dynamically stops down between **f/2**, **f/5.6**, and **f/16**.
  - Alters depth of field, narrowing the conjugate ray cone and controlling the diameter of confusion blur discs.
- **Real-Time 3D Ray Tracing**:
  - Interactive multi-field conjugate light rays tracing from foreground, midground, and background subjects through each glass element onto the ground-glass image sensor.
- **Natural Alpine Valley Diorama**:
  - Foreground evergreen spruce pines (27 cm).
  - Midground weathered cedar cabin with glowing hearth and olive-forest trees (54 cm).
  - Background alpine granite mountain peaks with snow caps (90 cm).
- **Darkroom Museum Gallery Environment**:
  - Suspended architectural overhead track lighting with turnbuckles and spotlights.
  - Golden-amber linear cove light bar washing down a vertical-striped slate wall.
  - Framed optical study paintings with dedicated brass museum picture lights.
  - Creamy stone tile floor reflecting warm studio luminaires and casting real-time dynamic shadows.
- **Interactive Console Table**:
  - Master 8-blade curved olive-bronze aperture dial on the left console.
  - 3 camera aperture iris units (`f/2`, `f/5.6`, `f/16`) with live selection halos on the right console.
  - Recessed 5-frame depth preview filmstrip with an interactive linear scrub handle.
- **Procedural Synthesizer Audio Engine**:
  - Web Audio API mechanical detent clicks, aperture blade snaps, and lens slide whirs.

---

## 🎮 Controls & Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `1` | Focus on **Foreground Pines** (27 cm) |
| `2` | Focus on **Midground Cabin** (54 cm) |
| `3` | Focus on **Background Mountains** (90 cm) |
| `←` / `→` | Scrub focus distance continuously |
| `Q` | Set Aperture to **f/2** (shallow depth of field, wide ray cone) |
| `W` | Set Aperture to **f/5.6** (balanced depth of field) |
| `E` | Set Aperture to **f/16** (deep depth of field, narrow ray cone) |
| `Space` / `Tab` | Toggle **Assembled** vs. **Exploded** lens view |
| `V` | Toggle camera view between **Bench Overview** and **Ground Glass Sensor** |
| `H` | Toggle HUD visibility (Zen Mode) |
| **Mouse Drag** | Orbit 3D camera / Drag 3D Focus Ring on the bench |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ (Node.js 20 recommended)
- npm, pnpm, or yarn

### Installation

```bash
# 1. Clone your repository
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>

# 2. Install dependencies (using legacy peer deps for Vite 8 / React 19)
npm install --legacy-peer-deps

# 3. Start development server
npm run dev
```

Open your browser at `http://localhost:3000`.

---

## 🌐 How to Host on GitHub (GitHub Pages)

This repository includes a pre-configured GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys your site to GitHub Pages whenever you push to `main`.

### Step 1: Create a New GitHub Repository
1. Go to [GitHub.com/new](https://github.com/new).
2. Enter a repository name (e.g., `plane-of-focus`).
3. Choose **Public** (recommended for free GitHub Pages).
4. Click **Create repository** (do not initialize with README since you already have one).

### Step 2: Push Your Code to GitHub
Run the following commands in your project root:

```bash
git init
git add .
git commit -m "Initial commit: The Plane of Focus 3D interactive optical bench"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### Step 3: Enable GitHub Pages in Repository Settings
1. On GitHub, navigate to your repository.
2. Click on the **Settings** tab.
3. In the left sidebar, click on **Pages** (under "Code and automation").
4. Under **Build and deployment** > **Source**, select **GitHub Actions**.
5. That's it! GitHub Actions will trigger `.github/workflows/deploy.yml` and publish your app.
6. Your live website URL will be:
   ```
   https://<your-username>.github.io/<your-repo-name>/
   ```

*(Note: `vite.config.ts` is already configured with `base: './'`, so your assets load properly on GitHub Pages subpaths!)*

---

## ⚡ Alternative Hosting Options

### 1. Vercel (1-Click Deployment)
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New Project** and select your repository.
3. Keep default settings:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install --legacy-peer-deps`
4. Click **Deploy**.

### 2. Netlify
1. Go to [netlify.com](https://netlify.com) and import your GitHub repository.
2. Set Build command to `npm run build` and Publish directory to `dist`.
3. Click **Deploy Site**.

### 3. Docker / Node Server
To run in production as a full-stack container or server:
```bash
npm run build
npm start
```
The Express server in `server.ts` will serve the compiled static files from `dist/` on port 3000.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **3D Graphics & Physics**: Three.js (WebGL, LatheGeometry, MeshPhysicalMaterial, PCFSoftShadowMap, ACESFilmicToneMapping)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Audio Engine**: Web Audio API (Synthesized detents, ratchets, and arpeggios)
- **Bundler**: Vite 8

---

## 📄 License

Apache-2.0 License. Free for educational and personal use.
