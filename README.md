# SignFlow - Multi-Page PDF Signer

Sign PDF documents across multiple pages with automatic signature background removal and precise coordinate positioning. Runs 100% locally in the browser with `pdf-lib`.

---

## Deploying to Vercel (পাব্লিক কেনেকৈ কৰিব / How to deploy publicly)

### পদ্ধতি ১: GitHub ৰ জৰিয়তে (Easy & Recommended)

1. এই প্ৰজেক্টটো GitHub ৰ এটা নতুন ৰিপজিটৰীত (Repository) পুছ কৰক:
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```
2. **[vercel.com](https://vercel.com)** ত লগ ইন কৰক।
3. **"Add New..."** -> **"Project"** ক্লিক কৰক।
4. আপোনাৰ GitHub ৰিপজিটৰীটো বাছনি কৰি **"Import"** ক্লিক কৰক।
5. Vercel এ স্বয়ংক্ৰিয়ভাৱে `Vite` ফ্ৰেমৱৰ্ক আৰু `vercel.json` ধৰা পেলাব:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. **"Deploy"** বুটামত ক্লিক কৰক। কেইছেকেণ্ডমানৰ ভিতৰতে আপোনাৰ এপ্লিকেচনটো এটা পাব্লিক URL (যেনে `https://your-app.vercel.app`) সহ লাইভ হৈ যাব!

---

### পদ্ধতি ২: Vercel CLI ৰ জৰিয়তে (Direct Terminal Deploy)

১. টাৰ্মিনেলত Vercel CLI ইনষ্টল কৰক:
```bash
npm install -g vercel
```

২. প্ৰজেক্ট ডাইৰেক্টৰীত এই কমাণ্ডটো চলাওক:
```bash
vercel
```

৩. পাব্লিক/প্ৰডাকচন ডিপ্লয়মেণ্টৰ বাবে:
```bash
vercel --prod
```

---

## Features
- **Client-Side PDF Signing**: Pure browser-based with `pdf-lib` (Zero CORS, no external PDF.js worker scripts).
- **Auto White Background Removal**: Smoothly removes white paper from scanned signatures and turns them into transparent PNGs.
- **Multi-Page Coordination**: Place signatures on multiple pages with exact X and Y coordinates.
- **Batch Actions**: Sign all pages or specific pages in 1 click.
