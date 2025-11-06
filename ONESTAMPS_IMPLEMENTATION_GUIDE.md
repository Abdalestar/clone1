# OneStamps Implementation Guide for Beginners

## 🎯 What We're Building

**OneStamps** is a one-time use stamp system where:
- Businesses generate unique QR codes in batches
- Each QR code can only be scanned ONCE by ONE customer
- After scanning, the stamp is marked as "used" and can't be reused
- Stamps automatically expire after a set time period

---

## 🧩 How It Works - The Big Picture

### For Businesses:
1. Business owner logs into a web dashboard
2. Clicks "Generate Stamps" button
3. Chooses how many stamps to create (e.g., 50 stamps)
4. Chooses expiry time (e.g., 7 days)
5. System creates 50 unique QR codes
6. Business downloads/prints the QR codes
7. Business hands out QR codes to customers (on cups, receipts, etc.)

### For Customers:
1. Customer receives a QR code from business
2. Opens your mobile app
3. Scans the QR code
4. System checks: Is this stamp still valid? Already used? Expired?
5. If valid → Stamp added to their loyalty card
6. If invalid → Error message shown
7. That specific QR code can NEVER be used again

---

## 🏗️ What We Need to Build (5 Main Parts)

### Part 1: Database Schema
**What it is**: The blueprint for how data is stored in Supabase
**What we're adding**:
- A new table called `one_time_stamps` to track each unique QR code
- A link between businesses and user accounts (so businesses can log in)

### Part 2: Supabase Edge Function
**What it is**: A serverless function that runs on Supabase's servers
**What it does**: Creates batches of unique QR codes when business clicks "Generate"
**Why we need it**: To generate many stamps quickly and securely

### Part 3: Business Web App
**What it is**: A simple website that businesses use to generate stamps
**What it looks like**: A login page + a dashboard with a "Generate Stamps" button
**Who uses it**: Business owners only

### Part 4: Stamp Claiming Flow
**What it is**: Code in your mobile app that validates and claims stamps
**What it does**: When customer scans QR, it checks validity and adds stamp to card
**Where it goes**: In your existing `ScanScreen.tsx`

### Part 5: Service Functions
**What it is**: JavaScript functions that talk to Supabase
**What they do**: Fetch stamps, validate them, mark them as used
**Where they go**: New file `src/services/oneTimeStamps.ts`

---

## 🔄 The Complete Flow (Technical)

```
BUSINESS SIDE:
┌──────────────┐
│ Business     │
│ logs into    │──> Opens web app (localhost:3000)
│ web app      │
└──────────────┘
        │
        ▼
┌──────────────┐
│ Clicks       │──> Calls Supabase Edge Function
│ "Generate    │    generateStamps(businessId, 50, 7days)
│ 50 Stamps"   │
└──────────────┘
        │
        ▼
┌──────────────┐
│ Supabase     │──> Creates 50 rows in one_time_stamps table
│ Edge Func    │    Each with unique code: STAMP_abc123, STAMP_def456...
│ runs          │
└──────────────┘
        │
        ▼
┌──────────────┐
│ Web app      │──> Shows QR codes, business prints/downloads
│ displays     │
│ QR codes     │
└──────────────┘

CUSTOMER SIDE:
┌──────────────┐
│ Customer     │──> Opens your React Native app
│ opens app    │
└──────────────┘
        │
        ▼
┌──────────────┐
│ Taps "Scan"  │──> Navigate to ScanScreen
│ button       │
└──────────────┘
        │
        ▼
┌──────────────┐
│ Scans QR     │──> Camera reads: "STAMP_abc123"
│ code         │
└──────────────┘
        │
        ▼
┌──────────────┐
│ App calls    │──> claimOneTimeStamp("STAMP_abc123", userId)
│ validation   │
│ function     │
└──────────────┘
        │
        ▼
┌──────────────┐
│ Supabase     │──> 1. Check if stamp exists
│ checks:      │    2. Check if status = 'active'
│              │    3. Check if not expired
└──────────────┘    4. Check if user already used it
        │
        ├──────> IF VALID:
        │        ├──> Mark stamp as 'used'
        │        ├──> Add stamp to user's card
        │        └──> Show success ✅
        │
        └──────> IF INVALID:
                 └──> Show error message ❌
```

---

## 📊 Database Changes Explained

### Current Database Structure:
```
users ────┐
          ├──> stamp_cards ──> stamps
businesses┘
```

### New Structure with OneStamps:
```
users ────┬──> stamp_cards ──> stamps
          │
          └──> businesses ──> one_time_stamps
                    ↑
                    │
         (business is owned by a user)
```

**Key Addition**: `one_time_stamps` table
- Each row = one unique QR code
- Tracks: business_id, stamp_code, status, used_by_user_id, expires_at

---

## 🔐 Security Explained

### Problem: What if someone guesses the QR code?
**Solution**: We use UUIDs (long random strings)
- Bad QR: "STAMP_1", "STAMP_2" (easy to guess)
- Good QR: "STAMP_f47ac10b-58cc-4372-a567-0e02b2c3d479" (impossible to guess)

### Problem: What if someone scans the same QR twice?
**Solution**: Database marks it as "used" after first scan
- First scan: status changes from 'active' to 'used'
- Second scan: System sees status='used' and rejects

### Problem: What if someone shares a QR code with 100 friends?
**Solution**: Only the FIRST person to scan gets the stamp
- Database uses atomic transactions (all-or-nothing)
- If two people scan at same millisecond, only one succeeds

---

## 🛠️ Technologies We're Using

1. **Supabase PostgreSQL**: Stores all data (stamps, users, businesses)
2. **Supabase Edge Functions**: Runs stamp generation code in the cloud
3. **React (Web App)**: Simple website for businesses
4. **React Native (Your App)**: Mobile app already exists, we just add stamp claiming
5. **QR Code Library**: Generates visual QR codes from text

---

## 📝 Files We'll Create/Modify

### New Files:
```
/business-web-app/               (New folder for business dashboard)
├── index.html                   (Login + Dashboard UI)
├── app.js                       (Business logic)
└── style.css                    (Styling)

/supabase/functions/
└── generate-stamps/
    └── index.ts                 (Edge function for stamp generation)

/src/services/
└── oneTimeStamps.ts             (Stamp validation logic)

/supabase_onestamps_schema.sql   (Database additions)
```

### Files We'll Modify:
```
/src/screens/ScanScreen.tsx      (Add one-time stamp handling)
```

---

## ✅ Prerequisites Checklist

Before we start coding, make sure you have:

- [ ] Supabase project created
- [ ] Supabase URL and Anon Key (from Supabase dashboard)
- [ ] Node.js installed (for running web app locally)
- [ ] Your React Native app already running
- [ ] Access to Supabase SQL Editor

---

## 🚀 Implementation Order

We'll build in this order to minimize errors:

1. **Database First** (Foundation)
   - Add one_time_stamps table
   - Link businesses to user accounts
   - Set up security policies

2. **Edge Function** (Backend Logic)
   - Create stamp generation function
   - Test it with SQL queries

3. **Business Web App** (Business Interface)
   - Build login page
   - Build stamp generation UI
   - Test stamp generation

4. **Mobile App Updates** (Customer Interface)
   - Add stamp validation service
   - Update scan screen
   - Test scanning flow

5. **End-to-End Testing**
   - Generate stamps as business
   - Scan as customer
   - Verify stamps can't be reused

---

## 🎓 Key Concepts for Beginners

### What is a UUID?
**UUID** = Universally Unique Identifier
- Example: `f47ac10b-58cc-4372-a567-0e02b2c3d479`
- Impossible to guess, prevents fraud
- Generated by Supabase automatically

### What is RLS (Row Level Security)?
**RLS** = Database rules that control who can see what data
- Example: "Users can only see their own stamp cards"
- Prevents users from seeing other people's data
- Set up in Supabase SQL Editor

### What is an Edge Function?
**Edge Function** = Code that runs on Supabase's servers (not your app)
- Like a remote helper that does work for you
- Faster and more secure than doing it in the app
- Written in TypeScript (like JavaScript)

### What is an Atomic Transaction?
**Atomic** = All-or-nothing operation
- Either EVERYTHING succeeds, or NOTHING happens
- Prevents half-completed operations
- Critical for stamp claiming (mark used + add to card must both succeed)

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot generate stamps"
**Solution**: Check if business is linked to a user account

### Issue: "Stamp already used" when it shouldn't be
**Solution**: Check the `status` column in `one_time_stamps` table

### Issue: "Stamp expired" too early
**Solution**: Check your `expires_at` timestamp calculation

### Issue: Business web app shows "Unauthorized"
**Solution**: Check RLS policies allow business owners to read their stamps

---

## 📚 Next Steps

Once you understand this guide, we'll:
1. Run the SQL script to update your database
2. Deploy the Edge Function to Supabase
3. Set up the business web app on your computer
4. Update your mobile app's scan screen
5. Test everything together

Ready to start? Let's build! 🚀
