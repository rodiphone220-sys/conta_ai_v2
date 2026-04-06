# Vercel Deployment Guide - Conta AI Facturador

## 🚀 Step-by-Step Deployment

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Prepare for Vercel deployment"
git branch -M main
git remote add origin https://github.com/rodiphone220-sys/conta_ai_v2.git
git push -u origin main
```

### Step 2: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and login
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `conta_ai_v2`
4. Click **"Import"**

### Step 3: Configure Environment Variables

In Vercel dashboard, go to **Settings** → **Environment Variables** and add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_API_URL` | (leave empty) | Production |
| `GOOGLE_SCRIPT_URL` | Your Google Apps Script URL | Production |
| `VITE_GOOGLE_SCRIPT_URL` | Your Google Apps Script URL | Production |
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID | Production |
| `GEMINI_API_KEY` | Your Gemini API Key (optional) | Production |
| `NODE_ENV` | `production` | Production |

⚠️ **Important**: `VITE_API_URL` MUST be empty or not set. This ensures the app uses relative `/api/*` paths.

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (~2-3 minutes)
3. Check the deployment logs for any errors

### Step 5: Verify Deployment

Test the following:
- ✅ Frontend loads correctly
- ✅ Login/Signup works (Google OAuth)
- ✅ API calls work (check browser console for errors)
- ✅ CFDI generation and signing (upload CSD certificates)
- ✅ AI Assistant (should use Gemini if configured, or show Ollama as offline)

---

## 🔧 Fixes Applied for Vercel

### 1. **API URL Configuration** (vite.config.ts)
- **Problem**: Vite was hardcoding `VITE_API_URL` to `http://localhost:3001` at build time
- **Fix**: Now uses empty string on production (relative paths) and localhost only in development

### 2. **Serverless Architecture**
- **How it works**: The app uses Vercel serverless functions in `/api/[[path]].ts` instead of Express server
- **Note**: The local `server.ts` is NOT used on Vercel

### 3. **CSD Certificates Storage**
- **Problem**: Vercel has no persistent filesystem
- **Solution**: Certificates are stored in-memory per session. Users need to re-upload certificates after each deployment or cold start
- **Recommendation**: For production, implement cloud storage (AWS S3, Google Cloud Storage)

### 4. **AI Services**
- **Ollama**: Won't work on Vercel (requires local server)
- **Gemini**: Configure `GEMINI_API_KEY` in Vercel env vars for AI assistant to work in production

---

## 🐛 Troubleshooting

### Issue: API calls fail with 404 or 500 errors
**Check**:
1. VITE_API_URL is empty in Vercel env vars
2. Vercel deployment logs for serverless function errors
3. Browser console for exact error messages

### Issue: Google OAuth doesn't work
**Fix**:
1. Verify `VITE_GOOGLE_CLIENT_ID` is set correctly
2. Add your Vercel domain to Google OAuth authorized origins
3. Check `GOOGLE_SCRIPT_URL` is accessible

### Issue: CSD Certificate upload fails
**Cause**: Vercel serverless functions have limitations with file uploads
**Workaround**: The app should handle this via the `/api/setup/save-csd` endpoint

### Issue: CFDI signing fails
**Check**:
1. Certificates are uploaded and valid (.cer and .key files)
2. CSD password is correct
3. Vercel function logs for specific error

---

## 📝 Viewing Vercel Logs (Step-by-Step)

1. Go to your Vercel dashboard
2. Click on your project
3. Click on the **"Deployments"** tab
4. Click on the latest deployment
5. Click on **"Functions"** tab to see serverless function logs
6. Or use Vercel CLI:
   ```bash
   vercel logs
   ```

---

## 🔒 Security Notes

- Never commit `.env` files with real credentials
- Use Vercel's encrypted environment variables
- Rotate API keys regularly
- CSD certificates are sensitive - handle with care

---

## 📦 Local Testing Before Deploy

Test the production build locally:
```bash
npm run build
npm run preview
```

This simulates the Vercel environment.

---

## 🆘 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for frontend errors
3. Verify all environment variables are set
4. Test locally with `npm run preview`
