# OneStamps Complete Setup Guide

This guide will walk you through setting up the OneStamps system from start to finish. Follow each step carefully!

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Update Database Schema](#step-1-update-database-schema)
3. [Step 2: Deploy Edge Function](#step-2-deploy-edge-function)
4. [Step 3: Set Up Business Web App](#step-3-set-up-business-web-app)
5. [Step 4: Test the Complete Flow](#step-4-test-the-complete-flow)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, make sure you have:

- ✅ A Supabase project (you already have this!)
- ✅ Node.js installed (for running web app)
- ✅ Supabase CLI installed (for deploying edge function)
- ✅ Your React Native app already set up
- ✅ Access to Supabase SQL Editor

---

## Step 1: Update Database Schema

### What This Does
Adds the `one_time_stamps` table and links businesses to user accounts.

### Instructions

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Click on your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "+ New query"

3. **Run the Schema Update**
   - Open the file: `supabase_onestamps_schema.sql`
   - Copy ALL the contents
   - Paste into the SQL Editor
   - Click "Run" (bottom right corner)

4. **Verify Success**
   You should see a success message:
   ```
   OneStamps schema additions complete! ✅
   Tables created: one_time_stamps
   Columns added: businesses.owner_user_id
   Functions created: claim_one_time_stamp(), expire_old_stamps()
   ```

5. **Check the New Table**
   - Click "Table Editor" in left sidebar
   - You should see `one_time_stamps` in the list of tables

✅ **Checkpoint**: Database is now ready for OneStamps!

---

## Step 2: Deploy Edge Function

### What This Does
Creates a serverless function that generates stamp batches for businesses.

### Option A: Using Supabase CLI (Recommended)

#### 2.1 Install Supabase CLI

```bash
# If you haven't installed it yet
npm install -g supabase
```

#### 2.2 Login to Supabase

```bash
supabase login
```

This will open your browser. Login with your Supabase credentials.

#### 2.3 Link Your Project

```bash
# Navigate to your project directory
cd /home/user/clone1

# Link to your Supabase project
supabase link --project-ref wlnphingifczfdqxaijb
```

(Replace `wlnphingifczfdqxaijb` with your actual project reference if different)

#### 2.4 Deploy the Function

```bash
supabase functions deploy generate-stamps
```

You should see:
```
Deploying function generate-stamps...
Function deployed successfully!
URL: https://wlnphingifczfdqxaijb.supabase.co/functions/v1/generate-stamps
```

#### 2.5 Save the Function URL

Copy the URL from the output. You'll need it in the next step!

### Option B: Manual Deployment via Dashboard

If CLI doesn't work:

1. Go to Supabase Dashboard → Edge Functions
2. Click "Create Function"
3. Name it: `generate-stamps`
4. Copy the code from `supabase/functions/generate-stamps/index.ts`
5. Paste and deploy

✅ **Checkpoint**: Edge function is deployed and accessible!

---

## Step 3: Set Up Business Web App

### What This Does
Creates a web interface where businesses can generate stamps.

### 3.1 Update Edge Function URL

1. Open `business-web-app/app.js`
2. Find this line (around line 10):
   ```javascript
   const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/generate-stamps`
   ```
3. Make sure it matches your deployed function URL from Step 2

### 3.2 Verify Supabase Credentials

The web app should already have your Supabase credentials from `src/services/supabase.ts`:
- URL: `https://wlnphingifczfdqxaijb.supabase.co`
- Anon Key: (already configured)

These are already set in `app.js` - no changes needed!

### 3.3 Run the Web App

#### Option A: Simple (Double-click)

1. Navigate to `business-web-app/` folder
2. Double-click `index.html`
3. It should open in your default browser

#### Option B: Local Server (Recommended for development)

**Using Python:**
```bash
cd business-web-app
python -m http.server 8000
```
Then open: http://localhost:8000

**Using Node.js:**
```bash
cd business-web-app
npx serve
```

**Using VS Code:**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

### 3.4 Create a Business Account

1. Open the web app
2. Click "Create Business Account"
3. Fill in:
   - Email: `demo@business.com` (or your preferred email)
   - Password: `password123` (or your preferred password)
   - Full Name: `Demo Business Owner`
   - Phone: `+97412345678`
   - Username: `demobiz`
4. Click "Create Account"
5. You'll be redirected to login - use the same credentials

### 3.5 Create Your First Business

1. After logging in, click "+ Create New Business"
2. Fill in your business details:
   ```
   Business Name: My Test Coffee Shop
   Category: Coffee Shop
   Description: Best coffee in town!
   Address: Souq Waqif, Doha
   Latitude: 25.2867
   Longitude: 51.5333
   Stamps Required: 5 (use fewer for testing!)
   Reward Description: Free Coffee
   ```
3. Click "Create Business"
4. Select your business from the dropdown

✅ **Checkpoint**: Business web app is running and you have a business account!

---

## Step 4: Test the Complete Flow

Now let's test everything end-to-end!

### 4.1 Generate Test Stamps (Business Side)

1. In the business web app, make sure your business is selected
2. In the "Generate One-Time Stamps" section:
   - Number of Stamps: `5`
   - Expires In: `7 Days`
3. Click "🎫 Generate Stamps"
4. You should see:
   - Success message
   - 5 QR codes displayed below
   - Statistics updated (5 active stamps)

### 4.2 Download a QR Code for Testing

1. Scroll down to see the generated QR codes
2. Click "Download QR" on the first stamp
3. Save the image to your computer/phone
4. Note: Each QR code contains a unique stamp code like `STAMP_abc123-def456-...`

### 4.3 Test in Mobile App

Now we need to test scanning from the customer side!

**Option A: If using iOS/Android Simulator**

1. Start your React Native app:
   ```bash
   cd /home/user/clone1
   npm start
   ```
2. Open the app in your simulator/emulator
3. Log in as a customer (create account if needed)
4. Navigate to the "Scan" tab
5. Since simulators can't scan real QR codes, you'll need to:
   - Implement manual entry (see "Adding Manual Entry" below)
   - OR use a physical device

**Option B: Physical Device (Recommended)**

1. Build and run the app on your physical phone:
   ```bash
   npm start
   # Scan QR code in terminal with Expo Go app
   ```
2. Log in as a customer
3. Go to "Scan" tab
4. Scan the QR code you downloaded
5. You should see:
   - ✅ "Stamp Added!" message
   - Confetti animation (if card is complete)
   - Stamp added to your wallet

### 4.4 Verify in Business Dashboard

1. Go back to the business web app
2. Click "Refresh" in the stamps table
3. You should see:
   - Active Stamps: 4 (one less)
   - Used Stamps: 1 (one more)
   - The used stamp should show:
     - Status: "used"
     - Used By: customer's email
     - Used At: timestamp

### 4.5 Test Stamp Rules

Try these tests to verify security:

**Test 1: Try scanning the same QR code twice**
- Expected: "Stamp already used" error ✅

**Test 2: Generate stamps with 1 day expiry, wait 1 day, try to scan**
- Expected: "Stamp has expired" error ✅

**Test 3: Try scanning 11 stamps within 1 hour**
- Expected: "Rate limit exceeded" error after 10th stamp ✅

✅ **Checkpoint**: Everything works end-to-end!

---

## 🎨 Adding Manual Entry (Optional)

To test without a physical device, add manual entry:

1. Open `src/screens/ScanScreen.tsx`
2. Find line 457 (the manual entry button)
3. Replace the alert with this:

```typescript
onPress={() => {
  Alert.prompt(
    'Enter Stamp Code',
    'Paste the stamp code (starts with STAMP_)',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: (code) => {
          if (code) {
            setScanned(true);
            handleScanData(code, 'qr');
          }
        },
      },
    ],
    'plain-text'
  );
}}
```

Now you can manually paste stamp codes from the business dashboard!

---

## 🎯 Production Deployment Checklist

Before going live with real customers:

### Security
- [ ] Change default passwords
- [ ] Use strong, unique passwords for business accounts
- [ ] Enable 2FA on Supabase account
- [ ] Review RLS policies in Supabase

### Testing
- [ ] Test stamp generation with max quantity (500)
- [ ] Test expired stamps handling
- [ ] Test rate limiting
- [ ] Test simultaneous scanning (two users, same stamp)
- [ ] Test on both iOS and Android

### Business Setup
- [ ] Create real business accounts
- [ ] Add business logos (update logo_url)
- [ ] Set appropriate stamp requirements
- [ ] Set reasonable expiry times

### Monitoring
- [ ] Set up Supabase alerts for errors
- [ ] Monitor edge function logs: `supabase functions logs generate-stamps`
- [ ] Track stamp usage analytics

---

## 🐛 Troubleshooting

### Issue: "Cannot generate stamps"

**Symptoms**: Clicking "Generate Stamps" shows an error

**Solutions**:
1. Check browser console (F12) for error details
2. Verify edge function is deployed:
   ```bash
   supabase functions list
   ```
3. Test edge function directly:
   ```bash
   curl -X POST YOUR_FUNCTION_URL \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"businessId":"your-biz-id","quantity":5,"expiryDays":7}'
   ```
4. Check edge function logs:
   ```bash
   supabase functions logs generate-stamps
   ```

### Issue: "Business not found" when scanning

**Symptoms**: Customer scans QR, gets "Business not found"

**Solutions**:
1. Check if business has `owner_user_id` set:
   ```sql
   SELECT id, name, owner_user_id FROM businesses;
   ```
2. Verify stamp is linked to correct business:
   ```sql
   SELECT * FROM one_time_stamps WHERE stamp_code = 'STAMP_xxx';
   ```

### Issue: "Stamp already used" but it wasn't

**Symptoms**: First scan shows "already used"

**Solutions**:
1. Check stamp status in database:
   ```sql
   SELECT * FROM one_time_stamps WHERE stamp_code = 'STAMP_xxx';
   ```
2. If status is wrong, manually reset (for testing only):
   ```sql
   UPDATE one_time_stamps
   SET status = 'active', used_by_user_id = NULL, used_at = NULL
   WHERE stamp_code = 'STAMP_xxx';
   ```

### Issue: Web app shows "Unauthorized"

**Symptoms**: Can't access business dashboard or generate stamps

**Solutions**:
1. Check if you're logged in (refresh page)
2. Verify RLS policies are set correctly:
   - Go to Supabase → Authentication → Policies
   - Check `one_time_stamps` table has correct policies
3. Re-run the schema SQL if policies are missing

### Issue: QR codes not displaying in web app

**Symptoms**: After generating stamps, no QR codes shown

**Solutions**:
1. Check browser console for errors
2. Verify QRCode library loaded:
   - Open Network tab in browser DevTools
   - Look for `qrcode.min.js` (should be status 200)
3. Try refreshing the page
4. Check if stamps were actually created:
   ```sql
   SELECT COUNT(*) FROM one_time_stamps WHERE business_id = 'your-biz-id';
   ```

### Issue: Mobile app doesn't recognize one-time stamps

**Symptoms**: Scanning QR shows old business flow instead of one-time stamp flow

**Solutions**:
1. Verify QR code starts with "STAMP_"
2. Check mobile app imported the new service:
   ```typescript
   import { isOneTimeStamp, ... } from '../services/oneTimeStamps';
   ```
3. Rebuild the app:
   ```bash
   npm start -- --clear
   ```

---

## 📊 Database Queries for Monitoring

### View all stamps for a business

```sql
SELECT
  stamp_code,
  status,
  created_at,
  expires_at,
  used_at,
  users.email as used_by
FROM one_time_stamps
LEFT JOIN users ON users.id = one_time_stamps.used_by_user_id
WHERE business_id = 'YOUR_BUSINESS_ID'
ORDER BY created_at DESC;
```

### Get stamp statistics

```sql
SELECT
  businesses.name,
  COUNT(*) FILTER (WHERE status = 'active') as active,
  COUNT(*) FILTER (WHERE status = 'used') as used,
  COUNT(*) FILTER (WHERE status = 'expired') as expired,
  COUNT(*) as total
FROM one_time_stamps
JOIN businesses ON businesses.id = one_time_stamps.business_id
GROUP BY businesses.name;
```

### Find expired stamps (to manually expire them)

```sql
SELECT * FROM one_time_stamps
WHERE status = 'active'
AND expires_at < NOW();
```

### Manually run expiry function

```sql
SELECT expire_old_stamps();
```

---

## 🎓 Next Steps

Now that OneStamps is working, consider:

1. **Add Business Analytics**
   - Usage graphs
   - Customer insights
   - Popular times

2. **Enhance QR Codes**
   - Add business logo to QR center
   - Custom colors
   - Batch PDF export

3. **Customer Features**
   - Push notifications when stamp expires soon
   - Social sharing
   - Stamp transfer between users

4. **Business Features**
   - Multiple staff accounts
   - Campaign tracking
   - Custom expiry per batch

5. **Monetization**
   - Free tier: 50 stamps/month
   - Pro tier: Unlimited + analytics
   - Enterprise: API access

---

## 📞 Support

If you're still stuck:
1. Check Supabase logs (Dashboard → Logs)
2. Check edge function logs: `supabase functions logs generate-stamps`
3. Review the implementation guide: `ONESTAMPS_IMPLEMENTATION_GUIDE.md`
4. Double-check all RLS policies are active

---

**Congratulations! 🎉**

You now have a fully functional one-time stamp system! Businesses can generate unique QR codes, and customers can scan them once to collect stamps on their loyalty cards.

Happy stamping! 🎫
