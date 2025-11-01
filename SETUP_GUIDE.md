# 🚀 SETUP INSTRUCTIONS - Loyalty Stamp App

## Step 1: Database Setup (Supabase)

1. **Open Your Supabase Project**
   - Go to: https://app.supabase.com
   - Select your project

2. **Run SQL Script**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"
   - Copy the ENTIRE content from `/app/supabase_setup.sql`
   - Paste into the SQL editor
   - Click "Run" button
   - Wait for confirmation: "Database setup complete!"

3. **Verify Tables Created**
   - Go to "Table Editor" in left sidebar
   - You should see these tables:
     - users
     - businesses (with 20 Qatar businesses)
     - stamp_cards
     - stamps
     - redemptions

## Step 2: Install and Run

```bash
# Navigate to app directory
cd /app

# Install dependencies (already done)
yarn install

# Start Expo development server
npx expo start
```

## Step 3: Test the App

### Option A: Test on Your Phone (Recommended)
1. Install "Expo Go" app from Play Store (Android) or App Store (iOS)
2. Scan the QR code shown in terminal/browser
3. App will load on your phone
4. **Note**: NFC features require a physical Android device

### Option B: Test on Emulator
1. Press 'a' for Android emulator
2. Press 'i' for iOS simulator
3. **Note**: NFC will not work on emulators, only QR scanning

## Step 4: Create Test Account

1. Open app → Click "Sign Up"
2. Fill in details:
   - **Email**: test@example.com
   - **Password**: test123456
   - **Username**: testuser
   - **Full Name**: Test User
   - **Phone**: +974 5555 1234
3. Click "Sign Up"
4. Go back and "Login" with same credentials

## Step 5: Test Features

### ✅ Home Screen
- View dashboard with stats
- See empty state message
- Click "Scan or Tap to Collect Stamp"

### ✅ Shops Screen
- View map with 20 Qatar business markers
- Toggle between Map/List view
- Search for businesses
- Filter by category (Coffee, Restaurant, Gym, etc.)
- Click on a marker/business
- View business details
- Click "Add Card"

### ✅ Scan Screen
- Toggle between "QR Scan" and "NFC Tap"
- **QR Scan**: Point camera at QR code (use any QR generator to create test codes matching `QR_SWC001`, `QR_PEB002`, etc.)
- **NFC Tap** (Android only): Hold phone near NFC tag
- See stamp collection animation
- Get haptic feedback

### ✅ Wallet Screen
- View all your stamp cards
- Filter: All / Active / Complete
- Watch progress bars fill up
- Redeem completed cards

### ✅ Profile Screen
- View your tier badge (Bronze → Gold → Diamond)
- See total stamps collected
- Check eco-impact (paper cards saved)
- Toggle notifications
- Logout

## 🧪 Testing QR Codes

To test QR scanning without real business QR codes:

1. Go to any QR code generator website (qr-code-generator.com)
2. Generate QR codes with these texts:
   - `QR_SWC001` (Souq Waqif Coffee House)
   - `QR_PEB002` (The Pearl Espresso Bar)
   - `QR_CC003` (Corniche Cafe)
   - ... (see supabase_setup.sql for all codes)
3. Print or display on another device
4. Scan with the app!

## 🔧 Troubleshooting

### "Network request failed"
- Check your Supabase credentials in `.env`
- Verify Supabase project is not paused
- Ensure internet connection

### "Camera permission denied"
- Go to phone Settings → Apps → Expo Go → Permissions
- Enable Camera permission

### "No businesses showing on map"
- Verify SQL script ran successfully
- Check Supabase Table Editor → businesses table has 20 rows
- Try pulling down to refresh

### "NFC not working"
- NFC only works on physical Android devices
- Enable NFC in device Settings → Connections
- iOS has limited NFC support (read-only)
- Use QR scan as fallback

### App won't start
```bash
# Clear cache
expo start -c

# Reinstall dependencies
rm -rf node_modules yarn.lock
yarn install
```

## 📱 Real Device Testing (NFC)

For full NFC experience:

1. **Android Phone Required** (NFC-enabled)
2. Enable NFC in Settings
3. Install Expo Go
4. Scan QR code from terminal
5. In app, go to Scan tab
6. Toggle to "NFC Tap" mode
7. Hold phone near NFC tag/terminal
8. Stamp collected! 🎉

## 🎯 Next Steps

1. ✅ Complete database setup
2. ✅ Test all 5 screens
3. ✅ Create test account
4. ✅ Add stamp cards
5. ✅ Collect stamps (QR/NFC)
6. ✅ Redeem rewards
7. ✅ Check profile stats

## 🌐 Production Deployment

When ready to deploy:

1. **Get Google Maps API Key**
   - https://console.cloud.google.com
   - Enable Maps SDK for Android/iOS
   - Add to app.json

2. **Build APK/IPA**
   ```bash
   # Android
   eas build --platform android
   
   # iOS
   eas build --platform ios
   ```

3. **Publish to Stores**
   - Google Play Store (Android)
   - Apple App Store (iOS)

## 📚 Additional Resources

- **Expo Docs**: https://docs.expo.dev
- **Supabase Docs**: https://supabase.com/docs
- **React Native Maps**: https://github.com/react-native-maps/react-native-maps
- **NFC Documentation**: https://developer.android.com/guide/topics/connectivity/nfc

## 💡 Tips

- Use real Android device for NFC testing
- Test on both iOS and Android
- Check Supabase logs for backend errors
- Use Expo Go for quick testing
- Build standalone app for production

---

**Need Help?** Check the main README.md for detailed documentation!

🎉 **Happy Stamp Collecting!**
