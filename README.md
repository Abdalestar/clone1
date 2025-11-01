# Loyalty Stamp App - NFC & QR Enabled

A full-featured Expo React Native mobile app combining the best features of StampMe, MyStamp, and Loop Loyalty apps. Users can collect digital loyalty stamps via **NFC tap or QR scan** to earn rewards at local businesses.

## 🎯 Features

### Core Functionality
- **Dual Collection Methods**: NFC tap (Android) + QR code scan for stamp collection
- **5-Tab Navigation**: Home, Shops, Scan, Wallet, Profile
- **Real Qatar Locations**: 20+ dummy businesses mapped across Doha
- **Supabase Backend**: Real-time data sync, authentication, and storage
- **Offline Support**: Collect stamps offline, sync when online
- **Gamification**: Tier system (Bronze → Silver → Gold → Diamond)

### Key Screens
1. **Home**: Dashboard with stamp cards, stats, quick scan button
2. **Shops**: Interactive map + list view with business discovery
3. **Scan**: Toggle between NFC tap and QR scan modes
4. **Wallet**: All stamp cards, redemption flow, completion tracking
5. **Profile**: User stats, settings, eco-impact tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Expo CLI: `npm install -g expo-cli`
- Supabase account (free tier works)
- Physical Android device for NFC testing (emulator for QR)

### Installation

1. **Clone and Install Dependencies**
```bash
cd /app
yarn install
```

2. **Set Up Supabase Database**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and run the entire `/app/supabase_setup.sql` script
   - This creates all tables, policies, and seed data (20 Qatar businesses)

3. **Configure Environment Variables**
   The `.env` file is already set up with your Supabase credentials:
   ```
   SUPABASE_URL=https://wlnphingifczfdqxaijb.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. **Start the App**
```bash
npx expo start
```

5. **Run on Device**
   - Scan QR code with Expo Go app (iOS/Android)
   - For full NFC testing, use physical Android device
   - iOS supports NFC read-only (limited functionality)

## 📱 Usage Guide

### First Time Setup
1. Open app → Sign up with email, username, full name, phone number
2. Login with your credentials
3. Grant camera and location permissions when prompted

### Collecting Stamps

**Method 1: QR Code Scan**
1. Go to "Scan" tab
2. Select "QR Scan" mode (default)
3. Point camera at business QR code
4. Stamp automatically added with animation!

**Method 2: NFC Tap (Android)**
1. Enable NFC in device settings
2. Go to "Scan" tab
3. Toggle to "NFC Tap" mode
4. Hold phone near business NFC terminal
5. Feel haptic feedback when stamp collected!

### Discovering Businesses
1. Go to "Shops" tab
2. View map with 20+ Qatar business locations
3. Toggle to list view for detailed info
4. Tap business marker/card to see details
5. Click "Add Card" to start collecting stamps

### Redeeming Rewards
1. Complete all stamps on a card (progress shown in Wallet)
2. Card turns green with "Ready to Redeem" badge
3. Tap "Redeem Now" button
4. Show confirmation to business staff
5. Enjoy your free reward! 🎉

## 🗺️ Qatar Business Locations

All 20 dummy businesses use **real coordinates** in Doha, Qatar:
- **Coffee Shops**: Souq Waqif, The Pearl, Corniche, Education City
- **Restaurants**: West Bay, Katara, Msheireb, Lusail Marina
- **Gyms**: Aspire Zone, West Bay Sports, Al Khor Fitness
- **Spas & Salons**: The Pearl, Old Airport, Dafna
- **Retail**: Villaggio Mall, City Center, Barwa Village

Center Point: Doha (25.2854° N, 51.5310° E)

## 🏗️ Technical Architecture

### Tech Stack
- **Framework**: Expo SDK 51 (React Native)
- **Language**: TypeScript
- **Navigation**: React Navigation (Bottom Tabs + Stack)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Maps**: react-native-maps (Google Maps)
- **NFC**: expo-nfc (Android full, iOS read-only)
- **QR Scan**: expo-barcode-scanner
- **State**: React Hooks + AsyncStorage (offline)

### Project Structure
```
/app/
├── App.tsx                    # Root component
├── package.json              # Dependencies
├── app.json                  # Expo config
├── supabase_setup.sql        # Database setup script
├── src/
│   ├── navigation/
│   │   ├── AppNavigator.tsx  # Bottom tabs (5 screens)
│   │   └── AuthNavigator.tsx # Login/signup flow
│   ├── screens/
│   │   ├── AuthScreen.tsx    # Email/password auth
│   │   ├── HomeScreen.tsx    # Dashboard
│   │   ├── ShopsScreen.tsx   # Map + business discovery
│   │   ├── ScanScreen.tsx    # NFC/QR scanner
│   │   ├── WalletScreen.tsx  # Stamp cards + redemption
│   │   └── ProfileScreen.tsx # User stats + settings
│   ├── components/
│   │   ├── StampCard.tsx     # Visual stamp card
│   │   └── BusinessCard.tsx  # Business list item
│   ├── services/
│   │   ├── supabase.ts       # Supabase client
│   │   ├── auth.ts           # Auth functions
│   │   └── stamps.ts         # Stamp CRUD operations
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   └── utils/
│       ├── constants.ts      # Colors, sizes, categories
│       └── qatarBusinesses.ts # Business seed data
```

### Database Schema
- **users**: Profile data (extends Supabase auth)
- **businesses**: Shops with lat/long, NFC tags, QR codes
- **stamp_cards**: User's active/completed cards
- **stamps**: Individual stamp records (with method: nfc/qr)
- **redemptions**: Reward redemption history

## 🔧 Configuration

### NFC Testing
- **Android**: Full support (read & write)
  - Enable NFC in Settings → Connections → NFC
  - Test with NFC tags or another NFC device
- **iOS**: Read-only mode (Core NFC)
  - Limited to reading NFC tags
  - Cannot initiate peer-to-peer

### Maps API (Optional)
- Basic maps work out of the box with Expo
- For production, get Google Maps API key:
  1. Go to Google Cloud Console
  2. Enable Maps SDK for Android/iOS
  3. Add key to `app.json`:
  ```json
  "android": {
    "config": {
      "googleMaps": {
        "apiKey": "YOUR_KEY_HERE"
      }
    }
  }
  ```

## 🎨 Design System

### Colors
- **Primary**: Blue (#007BFF) - Main actions, navigation
- **Secondary**: Purple (#6F42C1) - NFC highlights
- **Success**: Green (#28A745) - Stamps, completed cards
- **Warning**: Yellow (#FFC107) - Notifications, tips

### Key UI Patterns
- **Gradient Headers**: Linear gradients for visual appeal
- **Shadow Cards**: Elevation for depth and hierarchy
- **Pulsing Animations**: NFC waiting state feedback
- **Confetti**: Reward completion celebration
- **Haptic Feedback**: Physical confirmation on stamp collection

## 📊 User Flow

```
1. Sign Up → Enter details (email, username, name, phone)
2. Home Screen → View stats, quick scan button
3. Shops Tab → Discover businesses on map
4. Add Card → Select business, create stamp card
5. Scan Tab → Toggle NFC/QR, collect stamp
6. Wallet Tab → Track progress, redeem when complete
7. Profile Tab → View stats, tier, settings
```

## 🐛 Troubleshooting

### NFC Not Working
- Ensure NFC is enabled in device settings
- Check if device supports NFC (Android mostly)
- iOS has read-only limitations
- Fallback to QR scan mode

### Camera Permission Denied
- Go to device Settings → Apps → Expo Go → Permissions
- Enable Camera permission
- Restart app

### Supabase Connection Issues
- Verify `.env` credentials are correct
- Check Supabase project is not paused (free tier auto-pauses)
- Ensure tables are created via SQL script

### Map Not Loading
- Check location permissions granted
- Verify internet connection
- Wait a few seconds for tiles to load

## 🚢 Deployment

### Build APK (Android)
```bash
expo build:android
```

### Build IPA (iOS)
```bash
expo build:ios
```

### Web Build (Bonus)
```bash
expo build:web
```

## 📈 Future Enhancements
- [ ] Google OAuth login
- [ ] Phone OTP verification
- [ ] Push notifications for nearby businesses
- [ ] Social sharing of achievements
- [ ] Business analytics dashboard
- [ ] Multi-language support (Arabic + English)
- [ ] Apple Wallet integration
- [ ] iBeacon proximity detection

## 🌟 Key Features Implemented
✅ Email/password authentication with Supabase
✅ NFC tap collection (Android)
✅ QR code scanning
✅ Interactive maps with real Qatar locations
✅ 20+ dummy Qatar businesses with seed data
✅ Offline stamp collection with sync
✅ Gamification (tier system based on stamps)
✅ Eco-friendly messaging (paper saved counter)
✅ Beautiful animations and micro-interactions
✅ Responsive design with dark mode toggle
✅ Complete CRUD for stamps and cards
✅ Redemption flow with confirmation

## 📝 Testing Checklist

- [x] Sign up new account
- [x] Login existing account
- [x] View home dashboard with stats
- [x] Browse businesses on map
- [x] Switch map/list view
- [x] Add new stamp card
- [x] Collect stamp via QR scan
- [x] Collect stamp via NFC tap (Android)
- [x] View wallet with active cards
- [x] Filter cards (all/active/completed)
- [x] Redeem completed card
- [x] View profile with tier badge
- [x] Toggle notifications/dark mode
- [x] Logout

## 🤝 Support

For issues or questions:
1. Check troubleshooting section above
2. Review Supabase logs for backend errors
3. Test on physical device for NFC features
4. Verify all permissions granted in device settings

## 📄 License

This is an educational project demonstrating Expo, React Native, NFC, and Supabase integration.

---

**Built with ❤️ using Expo, React Native, Supabase, and NFC technology**

Enjoy collecting stamps and earning rewards! 🎉📱
