# SpaceRent — Deployment Guide

## Prerequisites

- **Git** installed (`git --version`)
- **Node.js 18+** installed (`node --version`)
- **Python 3.10+** installed (`python3 --version`)
- A **GitHub account**
- A **Stripe account** (https://dashboard.stripe.com)
- A **Supabase account** (https://supabase.com) — or any PostgreSQL provider
- An **S3-compatible storage** bucket (AWS S3, Supabase Storage, or MinIO)

---

## 1. Initialize Git & Commit Safely

```bash
# Navigate to the project directory
cd spaceren

# Initialize Git
git init

# Stage all files EXCEPT .env (already in .gitignore)
git add .

# Verify .env is NOT staged
git status            # .env should NOT appear

# Make the first commit
git commit -m "Initial commit: SpaceRent — rent micro-spaces for £1/month"
```

---

## 2. Create a GitHub Repository & Push

### Via GitHub website:
1. Go to https://github.com/new
2. Repository name: `spaceren`
3. Visibility: **Public**
4. Do NOT initialize with README, .gitignore, or license (we already have them)
5. Click "Create repository"

### Push your code:

```bash
# Add the remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/spaceren.git

# Push to GitHub
git push -u origin main
```

If your default branch is `master` instead of `main`:
```bash
git branch -M main
git push -u origin main
```

---

## 3. Set Up PostgreSQL Database (Supabase — Free Tier)

1. Go to https://supabase.com and sign up / log in
2. Click **"New Project"**
3. Fill in:
   - Name: `spaceren`
   - Database Password: (generate a strong password — save it)
   - Region: choose the closest one
4. Wait ~2 minutes for the database to provision
5. Go to **Project Settings > Database > Connection string**
6. Copy the **URI** (looks like: `postgresql://postgres:xxxx@db.xxxx.supabase.co:6543/postgres`)
7. Save this as your `DATABASE_URL`

### Run the schema:
```bash
# Option A: Using psql
psql "YOUR_DATABASE_URL" -f schema.sql

# Option B: Using Supabase SQL Editor (in the Supabase dashboard)
#   1. Go to SQL Editor
#   2. Copy-paste the entire contents of schema.sql
#   3. Click "Run"
```

---

## 4. Set Up Stripe

### Get API keys:
1. Go to https://dashboard.stripe.com/apikeys
2. Copy **Publishable key** (starts with `pk_test_`)
3. Copy **Secret key** (starts with `sk_test_`)

### Create Price IDs (optional but recommended):
1. Go to https://dashboard.stripe.com/products
2. Click **"Add Product"**
3. Name: `SpaceRent Monthly`
4. Pricing model: **Recurring**
5. Unit amount: **£1.00**
6. Currency: **GBP**
7. Billing period: **Monthly**
8. Click "Save product" → copy the **Price ID** (starts with `price_`)
9. Repeat for **Yearly**: £12.00, GBP, Yearly

### Set up webhook (for local development):
```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:8000/api/webhook/stripe
# Copy the webhook signing secret (whsec_...) that appears
```

### For production:
1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Endpoint URL: `https://YOUR-BACKEND-URL.com/api/webhook/stripe`
4. Events to listen to:
   - `invoice.paid`
   - `customer.subscription.created`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. Click "Add endpoint"
6. Reveal and copy the **Signing secret** (starts with `whsec_`)

---

## 5. Set Up Storage (S3-compatible)

Using Supabase Storage (simplest for Supabase users):
1. In Supabase dashboard, go to **Storage**
2. Click **"New bucket"** → name: `spaceren-uploads` → Public
3. Go to **Project Settings > API** — copy `anon public` key and `service_role` key
4. For S3-compatible access, go to **Project Settings > API > S3 Settings**
5. Enable S3-compatible API and copy the endpoint, access key, and secret key

Using AWS S3:
1. Create a bucket in AWS S3
2. Create IAM user with `AmazonS3FullAccess` policy
3. Copy Access Key ID and Secret Access Key

---

## 6. Configure Environment Variables

Create `.env` in the project root:

```bash
cp .env.example .env
```

Fill in all values (see comments in the file).

---

## 7. Run Locally

### Backend (FastAPI):
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API available at http://localhost:8000
Docs at http://localhost:8000/docs

### Frontend (Next.js):
```bash
cd frontend
npm install
npm run dev
```
App available at http://localhost:3000

---

## 8. Deploy to Production (Free / Low-Cost Options)

### Option A: Render (Backend) + Vercel (Frontend) — Recommended

#### Backend on Render:
1. Go to https://render.com and sign up
2. Click **"New +" > Web Service**
3. Connect your GitHub repo
4. Settings:
   - Name: `spaceren-api`
   - Root Directory: `backend`
   - Runtime: **Python**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables (all from your `.env`)
6. Click "Create Web Service"

#### Frontend on Vercel:
1. Go to https://vercel.com and sign up
2. Click **"Add New > Project"**
3. Import your GitHub repo
4. Settings:
   - Root Directory: `frontend`
   - Framework Preset: **Next.js**
   - Environment Variables:
     - `NEXT_PUBLIC_API_URL`: `https://spaceren-api.onrender.com` (your Render URL)
5. Click "Deploy"

### Option B: Railway (everything in one place)
1. Go to https://railway.app
2. Click **"New Project" > "Deploy from GitHub repo"**
3. Connect your repo
4. Add a PostgreSQL plugin
5. Add a web service:
   - Root directory: `backend`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add another web service for frontend:
   - Root directory: `frontend`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
7. Set environment variables for each service.

---

## 9. Set Up Stripe Webhook in Production

Once your backend is live at `https://your-app.onrender.com`:

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Endpoint URL: `https://your-app.onrender.com/api/webhook/stripe`
4. Select events: `invoice.paid`, `customer.subscription.created`, `customer.subscription.deleted`, `customer.subscription.updated`
5. Copy the signing secret and add it to your backend's environment variables as `STRIPE_WEBHOOK_SECRET`
6. Redeploy the backend (or update env vars)

---

## 10. Verify Everything Works

- [ ] Visit your frontend URL — you should see the landing page
- [ ] Sign up for a new account
- [ ] Browse spaces — they should load from the database
- [ ] Click "Rent Now" on a vacant space — you should be redirected to Stripe checkout
- [ ] Complete payment (£1 or £12 with a test card: `4242 4242 4242 4242`)
- [ ] After payment, you should be redirected to the dashboard
- [ ] The space should now show as "Rented" in your dashboard
- [ ] Click "Customize" on your rented space — you can add description, tags, and upload files
- [ ] Admin dashboard (if your email is set as `ADMIN_EMAIL`) shows metrics

---

## Troubleshooting

**"Space is already rented" error during checkout:**
- The space was rented between page load and checkout. Refresh and try another space.

**Webhook not working:**
- Check that `STRIPE_WEBHOOK_SECRET` is set correctly
- Check server logs for webhook endpoint errors
- In Stripe Dashboard > Webhooks, click "Send test webhook"

**File uploads failing:**
- Verify S3 credentials in `.env`
- Check that the bucket exists and is writable
- Check CORS settings on the bucket

**CORS errors in frontend:**
- Ensure `FRONTEND_URL` in the backend `.env` matches your actual frontend URL
- On Render/Railway, this should be `https://your-frontend.vercel.app`
