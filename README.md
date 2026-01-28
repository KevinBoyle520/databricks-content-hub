# Databricks Content Hub

A filterable content hub for sharing Databricks blog posts, videos, and customer stories with customers.

**Live data source:** Content is pulled from your Google Sheet, so updates to the sheet automatically appear on the site.

---

## 🚀 Deployment Guide (Step-by-Step)

### Step 1: Upload to GitHub

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** button in the top right → **New repository**
3. Name it `databricks-content-hub` (or whatever you prefer)
4. Keep it **Public** (required for free Vercel hosting)
5. Click **Create repository**
6. On the next page, click **"uploading an existing file"**
7. Drag and drop ALL the files from this folder into the upload area:
   - `package.json`
   - `vite.config.js`
   - `index.html`
   - `src/` folder (with `main.jsx` and `App.jsx` inside)
   - `public/` folder (with `favicon.svg` inside)
8. Click **Commit changes**

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New..."** → **Project**
3. Find your `databricks-content-hub` repo and click **Import**
4. Leave all settings as default (Vercel auto-detects Vite)
5. Click **Deploy**
6. Wait ~1 minute for the build to complete
7. 🎉 Your site is live! Vercel gives you a URL like `databricks-content-hub.vercel.app`

---

## 📝 Updating Content

Just edit your Google Sheet! The site fetches fresh data each time someone visits.

**Your Google Sheet columns should be:**
| Month | Topic | URL | Audience | Why is it important? | Area |

**Tips:**
- The `Month` column only needs to be filled in for the first row of each month
- `Audience` and `Area` can have multiple values separated by commas
- Add `[YouTube; 6 min]` or similar to the end of Topic titles for video badges

---

## 🎨 Customization

### Change the Google Sheet URL
Edit `src/App.jsx` and update the `SHEET_URL` constant at the top:

```javascript
const SHEET_URL = 'your-new-google-sheet-csv-url';
```

### Add new audience/area categories
Edit the `AUDIENCE_MAP` and `AREA_MAP` objects in `src/App.jsx` to map your raw CSV values to display categories.

### Update your contact info
Search for `Kevin.Boyle@Databricks.com` and `kevin-boyle-` in `src/App.jsx` to update the email and LinkedIn links.

---

## 🌐 Custom Domain (Optional)

Want a custom domain like `databricks-hub.yourname.com`?

1. Buy a domain from Namecheap, Google Domains, or Cloudflare (~$10-15/year)
2. In Vercel, go to your project → **Settings** → **Domains**
3. Add your domain and follow Vercel's DNS instructions
4. Vercel handles HTTPS automatically

---

## 🛠 Local Development (Optional)

If you want to make changes locally before deploying:

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## Troubleshooting

**Site shows "Loading content..." forever:**
- Check that your Google Sheet is published to web (File → Share → Publish to web)
- Make sure you selected CSV format when publishing
- Verify the URL in `src/App.jsx` matches your published CSV link

**Categories not showing up:**
- Check that your Audience/Area values in the Google Sheet match the mappings in `AUDIENCE_MAP` and `AREA_MAP` (case-insensitive)

**Changes not appearing:**
- Google Sheets can take a few minutes to update the published CSV
- Try a hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
