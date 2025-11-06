# OneStamps Business Web App

A standalone web application for businesses to generate and manage one-time QR code stamps.

## 🚀 Quick Start

### 1. Open the Web App

Simply open `index.html` in your web browser:
- Double-click `index.html`, OR
- Right-click → Open with → Chrome/Firefox/Safari, OR
- Use a local server (recommended for development):

```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx serve

# Option 3: VS Code Live Server extension
```

Then navigate to: `http://localhost:8000`

### 2. Create a Business Account

1. Click "Create Business Account"
2. Fill in your details (email, password, name, phone, username)
3. Click "Create Account"
4. You'll be redirected to login - use your credentials

### 3. Create Your Business

1. After logging in, click "+ Create New Business"
2. Fill in your business details:
   - Business Name (e.g., "My Coffee Shop")
   - Category (coffee, restaurant, gym, etc.)
   - Description
   - Address
   - Coordinates (default is Doha, Qatar)
   - Stamps Required (how many stamps customers need to collect)
   - Reward Description (what they get when complete)
3. Click "Create Business"

### 4. Generate Stamps

1. Select your business from the dropdown
2. Enter how many stamps you want to generate (1-500)
3. Choose expiry time (1 day to 3 months)
4. Click "Generate Stamps"
5. Download individual QR codes or all at once
6. Print or share with customers!

## 📊 Features

### Dashboard
- View statistics (active, used, expired stamps)
- Generate stamps in batches
- Download QR codes
- View all stamps in table format
- Filter by status

### Business Management
- Create multiple businesses
- Switch between businesses
- Track usage per business

### Stamp Generation
- Batch generation (up to 500 at once)
- Customizable expiry dates
- Unique QR codes for each stamp
- Download as PNG images

## 🔧 Configuration

The app is pre-configured with your Supabase credentials from `src/services/supabase.ts`.

If you need to update them, edit these lines in `app.js`:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'
const EDGE_FUNCTION_URL = 'YOUR_EDGE_FUNCTION_URL'
```

## 📝 Prerequisites

Before using this app, make sure you've completed:

1. ✅ Run `supabase_onestamps_schema.sql` in Supabase SQL Editor
2. ✅ Deploy the edge function: `supabase functions deploy generate-stamps`
3. ✅ Update `EDGE_FUNCTION_URL` in `app.js` with your deployed function URL

## 🖨️ Printing QR Codes

### For Receipts
1. Generate stamps
2. Download QR codes
3. Print on receipt paper using your POS printer

### For Cups/Products
1. Generate stamps
2. Download all QR codes
3. Use label printing software (Avery, Dymo, etc.)
4. Print on sticker labels
5. Stick on cups/products

### For Display
1. Generate a few stamps per day
2. Display QR codes on screen/tablet at checkout
3. Let customers scan directly

## 🛡️ Security

- All data is protected by Supabase Row Level Security (RLS)
- Businesses can only see their own stamps
- Authentication required for all actions
- Stamps are cryptographically unique (UUID-based)

## 🐛 Troubleshooting

### "Cannot generate stamps"
- Make sure you've selected a business
- Check that you're logged in
- Verify edge function is deployed

### "Unauthorized" errors
- Make sure you've run the database schema update
- Verify your business has `owner_user_id` set

### QR codes not displaying
- Check browser console for errors
- Ensure QRCode library loaded (check network tab)

### Edge function errors
- Verify function is deployed: `supabase functions list`
- Check function logs: `supabase functions logs generate-stamps`

## 📱 For Customers

Customers use the **mobile app** to scan these QR codes. They don't need access to this web app.

## 🔄 Workflow Example

1. **Morning**: Business owner logs in, generates 50 stamps for the day
2. **During Day**: Customers make purchases, business hands out QR codes
3. **Customer Scans**: Opens mobile app, scans QR, gets stamp
4. **Evening**: Business owner checks stats, sees how many stamps were used
5. **Next Day**: Unused stamps still valid (until expiry), generate more if needed

## 📄 Files

- `index.html` - Main HTML structure
- `style.css` - Styling and layout
- `app.js` - Application logic and Supabase integration
- `README.md` - This file

## 🆘 Support

If you encounter issues:
1. Check browser console for errors (F12)
2. Verify Supabase credentials are correct
3. Ensure database schema is updated
4. Check edge function deployment status

---

**Happy Stamping! 🎫**
