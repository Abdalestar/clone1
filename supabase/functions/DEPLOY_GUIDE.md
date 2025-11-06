# How to Deploy Supabase Edge Function

## Prerequisites
1. Install Supabase CLI: `npm install -g supabase`
2. Login to Supabase: `supabase login`

## Deployment Steps

### 1. Link to your Supabase project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```
(Get YOUR_PROJECT_REF from Supabase Dashboard > Settings > General)

### 2. Deploy the function
```bash
supabase functions deploy generate-stamps
```

### 3. Get the function URL
After deployment, you'll get a URL like:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-stamps
```

Save this URL - you'll use it in the business web app!

## Testing the Function

Use curl to test:
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-stamps \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "your-business-uuid",
    "quantity": 10,
    "expiryDays": 7
  }'
```

## Alternative: Local Development

Run the function locally for testing:
```bash
supabase functions serve generate-stamps
```

This runs on: `http://localhost:54321/functions/v1/generate-stamps`
