# 🚀 Vercel Deployment Checklist

## ✅ Changes Made for Vercel

- [x] Fixed `VITE_API_URL` in vite.config.ts to use relative paths on production
- [x] Updated .gitignore to exclude sensitive client_secret JSON files
- [x] Created .env.production template with placeholder variables
- [x] Created comprehensive deployment guide (VERCEL_DEPLOYMENT_GUIDE.md)

## 📋 Manual Steps for Vercel Dashboard

### 1. Environment Variables to Set in Vercel:
```
VITE_API_URL = (leave empty - important!)
GOOGLE_SCRIPT_URL = https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
VITE_GOOGLE_SCRIPT_URL = https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec  
VITE_GOOGLE_CLIENT_ID = YOUR_CLIENT_ID.apps.googleusercontent.com
GEMINI_API_KEY = your_gemini_api_key (optional, for AI assistant)
NODE_ENV = production
```

### 2. Google OAuth Configuration:
- Add your Vercel domain to authorized origins in Google Cloud Console
- Update authorized redirect URIs to include: `https://your-vercel-domain.vercel.app`

### 3. After First Deploy:
- Test all features
- Check Vercel function logs for errors
- Verify API calls work (check browser console)

## 🎯 GitHub Push Commands

```bash
# Stage all changes
git add .

# Review what will be committed
git status

# Commit changes
git commit -m "fix: prepare for Vercel deployment

- Fix VITE_API_URL to use relative paths on production
- Add .env.production template
- Update .gitignore to exclude sensitive files
- Add Vercel deployment guide"

# Push to new repo
git remote add origin https://github.com/rodiphone220-sys/conta_ai_v2.git
git push -u origin main
```

## 🔍 After Push - Vercel Steps

1. Go to vercel.com
2. Import from GitHub: `conta_ai_v2`
3. Set environment variables (see above)
4. Click Deploy
5. Monitor logs: Vercel Dashboard → Deployments → Latest → Functions tab

## 🧪 Test Locally Before Deploy

```bash
# Build for production
npm run build

# Test production build locally
npm run preview

# Visit http://localhost:4173 to verify it works
```
