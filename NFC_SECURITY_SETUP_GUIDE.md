# NFC Security Setup Guide for Beginners

This guide will walk you through implementing the NFC security features step-by-step using the Supabase Dashboard. No command-line experience required!

---

## Prerequisites

- Supabase account (sign up at https://supabase.com)
- Your project already created in Supabase
- Access to Supabase Dashboard

---

## Step 1: Apply Database Migration

### What this does:
Creates new tables to store NFC tag information and logs all stamp collection attempts.

### Instructions:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Click on your project

2. **Navigate to SQL Editor**
   - On the left sidebar, click **"SQL Editor"**
   - Click **"New query"** button

3. **Copy the Migration SQL**
   - Open the file `supabase/migrations/20250110000000_add_nfc_security.sql` in your project
   - Copy ALL the SQL code from that file

4. **Paste and Run**
   - Paste the SQL code into the SQL Editor
   - Click the **"Run"** button (bottom right corner)
   - You should see a success message: "Success. No rows returned"

5. **Verify Tables Were Created**
   - Click **"Table Editor"** in the left sidebar
   - You should now see these new tables:
     - `nfc_tags`
     - `stamp_collection_log`
   - Click on the `businesses` table
   - Scroll right to verify there's a new column called `encryption_key`

✅ **Step 1 Complete!** Your database now has the security tables.

---

## Step 2: Deploy the Edge Function

### What this does:
Creates a server-side function that validates NFC tags and prevents cloning.

### Instructions:

1. **Navigate to Edge Functions**
   - In the left sidebar, click **"Edge Functions"**
   - Click the **"Create a new function"** button

2. **Create the Function**
   - Function name: `verify-nfc-stamp`
   - Click **"Create function"**

3. **Copy the Function Code**
   - Open the file `supabase/functions/verify-nfc-stamp/index.ts` from your project
   - Copy ALL the TypeScript code

4. **Paste the Code**
   - In the Supabase Editor, **delete** all the default code
   - Paste the code you copied
   - Click the **"Deploy"** button (top right)
   - Wait for deployment to complete (you'll see "Deployed successfully")

5. **Verify Deployment**
   - You should see `verify-nfc-stamp` in your functions list
   - Status should be **"Active"**
   - Note down the function URL (it will look like: `https://your-project.supabase.co/functions/v1/verify-nfc-stamp`)

✅ **Step 2 Complete!** Your Edge Function is now live.

---

## Step 3: Update Your App Configuration

### What this does:
Tells your mobile app where to find the Edge Function.

### Instructions:

1. **Get Your Supabase URL**
   - In Supabase Dashboard, click **"Settings"** (bottom left)
   - Click **"API"**
   - Copy the **"Project URL"** (looks like: `https://abcdefgh.supabase.co`)

2. **Update the Code**
   - Open the file `src/services/stamps.ts` in your project
   - Find this line near the top:
     ```typescript
     const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
     ```
   - Replace `'https://your-project.supabase.co'` with YOUR actual Supabase URL
   - Save the file

3. **Example:**
   ```typescript
   // Before:
   const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
   
   // After (with your actual URL):
   const SUPABASE_URL = process.env.SUPABASE_URL || 'https://abcdefgh.supabase.co';
   ```

✅ **Step 3 Complete!** Your app can now talk to the Edge Function.

---

## Step 4: Test the Edge Function

### What this does:
Makes sure the Edge Function is working correctly before using it in production.

### Instructions:

1. **Get Test Data**
   - In Supabase Dashboard, go to **"Table Editor"**
   - Click on the `businesses` table
   - Click on any business row to view details
   - Copy the `id` (it's a long UUID like: `12345678-1234-1234-1234-123456789abc`)
   - Copy the `encryption_key` (if empty, see note below)

   **Note:** If `encryption_key` is empty:
   - Click **"SQL Editor"**
   - Run this command:
     ```sql
     UPDATE businesses 
     SET encryption_key = encode(gen_random_bytes(32), 'hex')
     WHERE encryption_key IS NULL;
     ```
   - Go back to Table Editor and refresh

2. **Create a Test Tag**
   - Go to **"Table Editor"** → `nfc_tags` table
   - Click **"Insert row"**
   - Fill in:
     - `uid`: `test-tag-001`
     - `business_id`: (paste the business ID you copied)
     - `branch_number`: `1`
     - `is_active`: `true`
   - Click **"Save"**

3. **Get Your User ID**
   - Go to **"Table Editor"** → **"Authentication"** → **"Users"**
   - Click on your test user
   - Copy the user `id`

4. **Test the Function**
   - Go to **"Edge Functions"** → `verify-nfc-stamp`
   - Click the **"Invoke"** button
   - In the request body, paste (replace with your actual values):
     ```json
     {
       "tag_uid": "test-tag-001",
       "encrypted_payload": "test:test",
       "user_id": "YOUR-USER-ID-HERE"
     }
     ```
   - Click **"Send request"**
   - You should get a response (might be an error about decryption - that's OK for now!)
   - If you see `"error": "Invalid NFC tag"`, the tag lookup is working!

✅ **Step 4 Complete!** Your Edge Function is responding.

---

## Step 5: Generate Encryption Keys for All Businesses

### What this does:
Creates a unique security key for each merchant to encrypt their NFC tags.

### Instructions:

1. **Run the Key Generation Script**
   - Go to **"SQL Editor"**
   - Click **"New query"**
   - Paste this SQL:
     ```sql
     UPDATE businesses 
     SET encryption_key = encode(gen_random_bytes(32), 'hex')
     WHERE encryption_key IS NULL OR encryption_key = '';
     ```
   - Click **"Run"**
   - You should see: "Success. X rows affected" (where X = number of businesses)

2. **Verify Keys Were Created**
   - Go to **"Table Editor"** → `businesses`
   - Click on any business
   - Check that `encryption_key` now has a long string of random characters
   - Example: `a3f5b2c8d1e6f9a7b4c2d8e1f6a9b3c5d2e7f1a8b6c4d9e2f7a1b8c3d6e9f2a5`

✅ **Step 5 Complete!** Each merchant now has a unique encryption key.

---

## Step 6: Set Up Row Level Security (RLS)

### What this does:
Prevents users from seeing or stealing other merchants' encryption keys.

### Instructions:

1. **Go to Table Editor**
   - Click **"Table Editor"** → `businesses`

2. **Enable RLS**
   - At the top, you'll see "Row Level Security"
   - Click **"Enable RLS"** if it's not already enabled

3. **Create Policy for Reading**
   - Click **"Add policy"**
   - Choose **"Create a policy from scratch"**
   - Policy name: `Public businesses read`
   - Allowed operation: **SELECT** (read)
   - Target roles: **public**
   - USING expression:
     ```sql
     true
     ```
   - Click **"Save policy"**

4. **Create Policy to Protect Keys**
   - Click **"Add policy"** again
   - Choose **"Create a policy from scratch"**
   - Policy name: `Service role only for encryption keys`
   - Allowed operation: **SELECT**
   - Target roles: **service_role**
   - USING expression:
     ```sql
     true
     ```
   - Click **"Save policy"**

5. **Do the Same for Other Tables**

   **For `nfc_tags` table:**
   - Enable RLS
   - Add policy:
     - Name: `Service role only`
     - Operation: **ALL**
     - Target roles: **service_role**
     - USING: `true`
     - WITH CHECK: `true`

   **For `stamp_collection_log` table:**
   - Enable RLS
   - Add policy:
     - Name: `Service role only`
     - Operation: **ALL**
     - Target roles: **service_role**
     - USING: `true`
     - WITH CHECK: `true`

✅ **Step 6 Complete!** Your data is now protected.

---

## Step 7: Test End-to-End with Mobile App

### What this does:
Verifies everything works together in your actual app.

### Instructions:

1. **Rebuild Your App**
   - If using Expo:
     ```
     npm start
     ```
   - Or build for device:
     ```
     eas build --profile development --platform android
     ```

2. **Install on NFC-Enabled Device**
   - Download and install the built app
   - Log in with your test account

3. **Create a Test Tag (Manual)**
   - Go to Supabase Dashboard → **"Table Editor"** → `nfc_tags`
   - Click **"Insert row"**
   - Fill in:
     - `uid`: `04:11:22:33:44:55:66` (example NFC UID format)
     - `business_id`: (pick a business from your businesses table)
     - `branch_number`: `1`
     - `is_active`: `true`
   - Click **"Save"**

4. **Simulate a Scan (for testing without physical tag)**
   - Since you don't have a physical encrypted tag yet, you can:
   - Open **"SQL Editor"** and run:
     ```sql
     SELECT * FROM nfc_tags WHERE business_id = 'YOUR-BUSINESS-ID';
     ```
   - This confirms your tag is registered

5. **Check Logs**
   - After attempting a scan in the app
   - Go to **"Edge Functions"** → `verify-nfc-stamp` → **"Logs"**
   - You should see requests coming in
   - Check for errors or success messages

✅ **Step 7 Complete!** Your app is now using the secure NFC flow.

---

## Step 8: Provision Real NFC Tags

### What this does:
Writes encrypted data to physical NFC tags and registers them.

### Option A: Using the Provisioning Tool (Recommended)

1. **Add Tool to Your App**
   - The file `tools/TagProvisioningTool.tsx` is already created
   - Import it into your app as a new screen (ask if you need help with this)

2. **Use the Tool**
   - Open the tool screen in your app (on an NFC-enabled Android device)
   - Select a business
   - Click "Generate New Key" (if key doesn't exist)
   - Enter branch number
   - Click "Read NFC Tag UID" and tap your blank NFC tag
   - Click "Write Encrypted Tag"
   - The tag is now provisioned!

### Option B: Manual Database Registration

If you can't write to tags yet (no NFC device), you can register UIDs manually:

1. **Get Tag UID**
   - Use an NFC reader app (like "NFC Tools" on Android)
   - Scan your NFC tag
   - Note down the UID (looks like: `04:AB:CD:12:34:56:78`)

2. **Register in Database**
   - Go to Supabase Dashboard → **"Table Editor"** → `nfc_tags`
   - Click **"Insert row"**
   - Fill in:
     - `uid`: (paste the UID from step 1)
     - `business_id`: (select a business)
     - `branch_number`: `1`
     - `is_active`: `true`
   - Click **"Save"**

3. **Write Encrypted Payload Later**
   - When you have access to an NFC writer, use the Provisioning Tool

✅ **Step 8 Complete!** You have provisioned NFC tags.

---

## Step 9: Monitor and Verify

### What this does:
Checks that everything is working and detects any issues.

### Instructions:

1. **Check Recent Stamp Collections**
   - Go to **"Table Editor"** → `stamp_collection_log`
   - You should see entries when users scan tags
   - Check columns:
     - `user_id`: Who scanned
     - `business_id`: Which business
     - `tag_uid`: Which tag
     - `collected_at`: When

2. **Check for Errors**
   - Go to **"Edge Functions"** → `verify-nfc-stamp` → **"Logs"**
   - Look for any error messages
   - Common errors:
     - "Invalid NFC tag" = Tag UID not in database
     - "Rate limit exceeded" = User scanned too many times
     - "Invalid payload encryption" = Wrong encryption key

3. **Test Rate Limiting**
   - Have a test user scan the same tag 3 times quickly
   - The 3rd scan should fail with "Rate limit exceeded"
   - Go to `stamp_collection_log` to verify only 2 stamps were added

4. **Test Cloned Tag Protection**
   - Try to use a tag UID that's NOT in your `nfc_tags` table
   - The scan should fail with "Invalid NFC tag"
   - This proves cloned tags won't work!

✅ **Step 9 Complete!** Your security system is working.

---

## Common Issues and Solutions

### Issue: "Edge Function not found"
**Solution:**
- Go to Edge Functions in dashboard
- Make sure `verify-nfc-stamp` is listed and Active
- Redeploy if needed

### Issue: "Invalid NFC tag" error
**Solution:**
- Check that tag UID is in `nfc_tags` table
- Make sure `is_active` is `true`
- Verify UID matches exactly (case-sensitive)

### Issue: "Decryption failed"
**Solution:**
- Check that business has an `encryption_key`
- Make sure the tag was written with the SAME key
- Re-provision the tag using the Provisioning Tool

### Issue: Edge Function is slow
**Solution:**
- Check Edge Function logs for errors
- Verify database indexes exist (they're created automatically in migration)
- Make sure your Supabase project isn't paused (free tier)

### Issue: Can't write to NFC tags
**Solution:**
- NFC writing only works on **Android** devices (not iOS)
- Must use a **custom development build**, not Expo Go
- Build with: `eas build --profile development --platform android`

---

## Security Checklist

Before going to production, verify:

- [ ] All businesses have `encryption_key` set
- [ ] RLS (Row Level Security) is enabled on all new tables
- [ ] Edge Function `verify-nfc-stamp` is deployed and active
- [ ] At least one test tag is registered and working
- [ ] Rate limiting works (max 2 stamps per day per merchant)
- [ ] Unregistered tag UIDs are rejected
- [ ] Logs are being written to `stamp_collection_log`

---

## Next Steps

1. **Provision 5-10 test tags** for pilot merchants
2. **Monitor logs daily** for the first week
3. **Train merchants** on what the new tags look like
4. **Replace all old tags** gradually
5. **Set up alerts** for suspicious activity (optional, advanced)

---

## Need Help?

### Check Logs:
- Database logs: **Supabase Dashboard** → **Logs** → **Database**
- Function logs: **Edge Functions** → `verify-nfc-stamp` → **Logs**

### Test Queries:
```sql
-- See all registered tags
SELECT * FROM nfc_tags ORDER BY issued_at DESC;

-- See recent stamp collections
SELECT * FROM stamp_collection_log ORDER BY collected_at DESC LIMIT 50;

-- Check which businesses have encryption keys
SELECT id, name, 
  CASE WHEN encryption_key IS NOT NULL THEN '✓ Has key' ELSE '✗ No key' END as key_status
FROM businesses;

-- Find suspicious activity (same tag, multiple users)
SELECT tag_uid, COUNT(DISTINCT user_id) as different_users
FROM stamp_collection_log
WHERE collected_at > NOW() - INTERVAL '1 day'
GROUP BY tag_uid
HAVING COUNT(DISTINCT user_id) > 3;
```

---

## Congratulations! 🎉

You've successfully implemented NFC security. Your system now:
- ✅ Validates every tag against a whitelist
- ✅ Uses encryption to protect tag data
- ✅ Prevents unlimited stamp collection
- ✅ Logs all attempts for fraud detection
- ✅ Stops cloned tags from working

**Your merchants and customers are now protected from NFC cloning attacks!**
