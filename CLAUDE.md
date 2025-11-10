# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

```bash
# Install dependencies
npm install

# Start the Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

## Project Overview

**Loyalty Stamp App** is a React Native mobile application built with Expo that enables users to collect digital loyalty stamps at businesses using NFC tap or QR code scanning. Users accumulate stamps to complete cards and redeem rewards.

### Tech Stack
- **Framework**: Expo SDK 51 (React Native with TypeScript)
- **Navigation**: React Navigation (bottom tab + stack navigation)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Key Libraries**:
  - `react-native-nfc-manager` - NFC reading/writing (Android)
  - `expo-barcode-scanner` - QR code scanning
  - `react-native-maps` - Google Maps integration
  - `react-native-reanimated` - Animations
  - `react-native-confetti-cannon` - Celebration animations
  - `@react-native-async-storage/async-storage` - Local persistence

## Architecture & Code Organization

### Core Structure
- **App.tsx**: Root component handling auth state and navigation switching
- **src/navigation/**: Navigation stacks (AppNavigator for authenticated, AuthNavigator for login/signup)
- **src/screens/**: 5 main screens (Home, Shops, Scan, Wallet, Profile)
- **src/services/**: Business logic layer (supabase client, auth, stamps, NFC, one-time stamps)
- **src/components/**: Reusable UI components (StampCard, BusinessCard, SuccessDialog)
- **src/types/index.ts**: TypeScript interfaces for all data models
- **src/utils/**: Constants, business seed data, payload encoding utilities

### Key Services

#### Authentication (`src/services/auth.ts`)
- Manages Supabase Auth (signup, login, logout)
- Stores user sessions in AsyncStorage for offline support
- Returns current authenticated user

#### Stamps Service (`src/services/stamps.ts`)
- **Core operations**: Create stamp cards, add stamps, get cards, delete cards, redeem rewards
- Handles both NFC and QR collection methods
- Fetches businesses by NFC tag or QR code ID
- Manages the relationship between users, businesses, and stamp cards

#### NFC Service (`src/services/nfc.ts`)
- **Class-based design** with singleton instance
- Detects Expo Go environment (which doesn't support native NFC)
- Android: Full NFC read/write support via NDEF messages
- iOS: Read-only NFC capability
- Provides `startReading()`, `stopReading()`, `writeTag()` methods
- Includes cleanup for resource management

#### One-Time Stamps Service (`src/services/oneTimeStamps.ts`) - NEW FEATURE
- **Purpose**: Validates and claims one-time use QR stamps
- **Key Functions**:
  - `validateOneTimeStamp()` - Checks if stamp is active, not used, and not expired
  - `claimOneTimeStamp()` - Atomic database operation to mark stamp as used
  - `isOneTimeStamp()` - Identifies stamps by "STAMP_" prefix
  - `checkUserRateLimit()` - Prevents abuse (max 10 stamps/hour per user)
- Uses Supabase RPC function `claim_one_time_stamp` for atomic transactions
- Stores: stamp_code, business_id, status (active/used/expired), user_id, timestamps

### Data Models

**User** - Supabase auth + profile data (email, username, full_name, phone_number)
**Business** - Shop info (name, category, location lat/long, stamps_required, reward_description, NFC tag, QR code)
**StampCard** - User's card at a business (user_id, business_id, stamps_collected, is_completed, expires_at)
**Stamp** - Individual stamp record (stamp_card_id, collected_at, method: nfc/qr/manual)
**OneTimeStamp** - One-time use code (stamp_code, business_id, status, used_by_user_id, expires_at)
**Redemption** - Reward redemption history (user_id, stamp_card_id, business_id, redeemed_at)

## Key Implementation Details

### Scan Screen Logic (`src/screens/ScanScreen.tsx`)
The scan screen is the core feature, handling both QR and NFC collection:

1. **QR Mode**: Uses `expo-barcode-scanner` to detect QR codes
2. **NFC Mode**: Uses `react-native-nfc-manager` with manual button trigger
3. **Stamp Processing**:
   - Checks if it's a one-time stamp (`STAMP_` prefix) → calls `claimOneTimeStamp()`
   - Otherwise, looks up business by QR/NFC code → finds/creates stamp card → adds stamp
   - Plays haptic feedback and confetti on success
4. **Success Dialog**: Shows stamp count, card completion status, and unlocks confetti animation
5. **Rate Limiting**: One-time stamps are rate-limited to 10 per hour per user

### Navigation Flow
```
App.tsx (auth state check)
├─ AuthNavigator (no user)
│  └─ AuthScreen (signup/login)
└─ AppNavigator (authenticated)
   ├─ HomeScreen (dashboard, stats)
   ├─ ShopsScreen (map + business list)
   ├─ ScanScreen (QR/NFC collection)
   ├─ WalletScreen (stamp cards, redemption)
   └─ ProfileScreen (user stats, settings)
```

### Payload Encoding (`src/utils/payload.ts`)
- Encodes/decodes business IDs in QR codes and NFC tags
- Format: 4-byte integer payload with checksum validation

### Environment Configuration
- Supabase credentials stored in `process.env` (SUPABASE_URL, SUPABASE_ANON_KEY)
- Fallback to hardcoded credentials in `src/services/supabase.ts` (for development)
- Platform-specific permissions configured in `app.json` (NFC, camera, location)

## Common Development Tasks

### Adding a New Stamp Collection Method
1. Update `stamps.ts` to add a new lookup function (e.g., `getBusinessByBluetooth()`)
2. Add UI toggle in `ScanScreen.tsx` to switch to new mode
3. Implement detection logic in the scan/tap handlers
4. Update `Stamp.method` type in `types/index.ts` if needed

### Testing One-Time Stamps
1. Generate a stamp code starting with "STAMP_" (e.g., "STAMP_ABC123")
2. Create a `one_time_stamps` database record with `status: 'active'`
3. Scan the QR code containing this code
4. Verify it marks the stamp as used and adds it to the user's card

### Testing NFC
- **Expo Go**: NFC is not available (console logs will show this)
- **Development Build**: Use `eas build` to create a custom Expo development build with native NFC support
- **Physical Device**: Android with NFC enabled can test `NFCService.startReading()`
- **Emulator**: Use QR fallback for testing UI

### Building for Production
```bash
eas build --platform android  # Creates APK/AAB
eas build --platform ios      # Creates IPA
```

## Important Design Patterns

### Singleton NFC Service
NFC is exported as a singleton (`export default new NFCService()`) to maintain consistent state across the app. Always import the default export to use shared instance.

### Async Storage for Offline Support
The app persists session tokens in AsyncStorage, allowing offline stamp collection. Stamps sync when connection is restored via Supabase's real-time subscriptions.

### Atomic Transactions for One-Time Stamps
The `claim_one_time_stamp()` RPC function in Supabase ensures only one user can claim a stamp. Always use this RPC instead of separate select/update queries.

### Rate Limiting Pattern
The `checkUserRateLimit()` function is checked before claiming one-time stamps to prevent abuse. Current limit: 10 stamps/hour per user (adjustable in `oneTimeStamps.ts:200`).

## Database Setup

Run the SQL script to initialize Supabase:
```
supabase_setup.sql
```

This creates:
- Tables: users, businesses, stamp_cards, stamps, redemptions, one_time_stamps
- Policies: RLS (Row Level Security) for user isolation
- Seed data: 20 Qatar businesses with real Doha coordinates
- RPC function: `claim_one_time_stamp()` for atomic claims

## Debugging

### Enable Debug Logging
- NFC Service logs with prefix "NFC" in console
- Supabase client can be inspected via `supabase.auth` and `supabase` directly
- AsyncStorage can be inspected: `AsyncStorage.getAllKeys()` and `AsyncStorage.getItem(key)`

### Common Issues
- **"NFC not available in Expo Go"**: This is expected. Use a development build or physical Android APK.
- **QR codes not scanning**: Check camera permission is granted in device settings
- **Stamps not syncing**: Check Supabase connection in console, verify tables exist, check RLS policies

## Git Workflow Notes

- Main branch is `main`
- Current development branch: `claude/one-time-stamps-brainstorm-011CUqDYNPXLDWmhvidDnYkK`
- Recent changes include OneStamps feature implementation
- Modified files: `App.tsx`, `package.json`, `src/screens/ScanScreen.tsx`, `src/services/nfc.ts`, `src/utils/payload.ts`
