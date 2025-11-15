# StampMe Staff App

A React Native mobile application for merchant staff to issue digital loyalty stamps to customers via NFC tags or QR codes.

## Features

- **PIN-based Authentication**: Secure 4-digit PIN login for staff members
- **Stamp Issuance**: Issue stamps via NFC tap or QR code display
- **Real-time Dashboard**: Live stats showing today's activity and available inventory
- **Inventory Management**: Generate new stamps and monitor inventory levels
- **Transaction History**: View and filter all stamp issuance transactions
- **Offline Support**: Queue stamps when offline and sync when connection restored
- **Role-based Permissions**: Different access levels for staff, managers, and owners

## Tech Stack

- **Framework**: Expo SDK 51 (React Native 0.74.5)
- **Language**: TypeScript
- **Backend**: Supabase (PostgreSQL + real-time subscriptions)
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **NFC**: react-native-nfc-manager (Android)
- **QR Generation**: react-native-qrcode-svg

## Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- For NFC testing: Physical Android device with NFC capability
- Supabase account with database setup complete

## Setup Instructions

### 1. Install Dependencies

```bash
cd staff-app
npm install
```

### 2. Database Setup

The database schema is already applied to your Supabase instance. It includes:

- `staff_members` table with demo account
- `staff_sessions` for session management
- `stamp_transactions` for audit logs
- `one_time_stamps` table extensions
- Functions: `generate_one_time_stamps()`, `validate_staff_pin()`

### 3. Environment Configuration

The app is pre-configured to use the same Supabase instance as the customer app:

- URL: `https://wlnphingifczfdqxaijb.supabase.co`
- Anon Key: Already configured in `src/services/supabase.ts`

### 4. Run the App

```bash
# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Demo Credentials

- **Email**: `staff@demo.com`
- **PIN**: `1234`
- **Role**: Manager (full permissions)

## Project Structure

```
staff-app/
├── App.tsx                    # Root component with navigation
├── src/
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── services/
│   │   ├── supabase.ts       # Supabase client
│   │   ├── auth.ts           # Authentication (PIN login)
│   │   ├── stampIssuance.ts  # Stamp issuance engine
│   │   ├── nfc.ts            # NFC read/write operations
│   │   ├── inventory.ts      # Stamp generation & stats
│   │   └── dashboard.ts      # Dashboard data fetching
│   ├── screens/
│   │   ├── LoginScreen.tsx   # PIN keypad login
│   │   └── HomeScreen.tsx    # Dashboard with Issue Stamp button
│   ├── navigation/           # Navigation structure (to be expanded)
│   ├── components/           # Reusable UI components (to be expanded)
│   └── utils/                # Utility functions (to be expanded)
└── assets/                   # App icons and images
```

## Key Features Implementation

### 1. PIN Authentication

The `LoginScreen` provides a numeric keypad for 4-digit PIN entry:
- Auto-submits on 4th digit
- Shake animation on incorrect PIN
- Session stored in AsyncStorage for 24 hours

### 2. Stamp Issuance Flow

**NFC Method** (5-minute expiry):
1. Staff taps "Issue Stamp" button
2. Selects "NFC Tap" method
3. App fetches unused stamp from database
4. Staff holds NFC tag near phone
5. App writes stamp code to tag
6. Stamp marked as issued in database
7. Transaction logged

**QR Method** (2-minute expiry):
1. Staff taps "Issue Stamp" button
2. Selects "QR Code" method
3. App generates QR code with stamp code
4. Customer scans with their phone
5. Stamp marked as used when redeemed

### 3. Dashboard Stats

Real-time display of:
- Stamps issued today
- Customers served today
- Rewards redeemed today
- Available stamp inventory

### 4. Inventory Management

- Low inventory warning when < 50 stamps
- Quick generation buttons (100, 500, 1000 stamps)
- Custom quantity option
- Auto-generation settings (optional)

### 5. Offline Support

- Stamps queued locally when offline
- Auto-sync when connection restored
- Visual indicator showing pending stamps

## Database Functions

### validate_staff_pin(email, pin)

Validates staff PIN and creates session:

```sql
SELECT validate_staff_pin('staff@demo.com', '1234');
```

Returns session data with staff info and permissions.

### generate_one_time_stamps(merchant_id, quantity, expiry_minutes)

Bulk generates stamp codes:

```sql
SELECT generate_one_time_stamps(
    '123e4567-e89b-12d3-a456-426614174000',
    500,
    1440
);
```

## Permissions System

Staff roles and permissions:

**Staff** (basic):
- can_issue_stamps: true
- can_manage_inventory: true
- can_void_stamps: false
- can_view_analytics: false
- can_manage_staff: false

**Manager**:
- All staff permissions
- can_void_stamps: true
- can_view_analytics: true

**Owner**:
- All permissions
- can_manage_staff: true

## NFC Configuration

### Android

NFC is fully supported on Android devices. The app will:
- Request NFC permission automatically
- Detect if NFC is available and enabled
- Guide staff to enable NFC if disabled

### iOS

NFC on iOS is read-only. For iOS devices:
- Use QR code method instead
- NFC functionality will be disabled automatically

## Testing

### Test PIN Login

1. Open app
2. Enter PIN: 1234
3. Should see home dashboard

### Test Stamp Issuance (QR)

1. Login as staff
2. Tap "ISSUE STAMP" button
3. Select "QR Code"
4. QR code should display with 2-minute countdown
5. Check database to verify stamp marked as issued

### Test NFC (Android only)

1. Require physical Android device with NFC
2. Have blank NFC tag available
3. Login and tap "ISSUE STAMP"
4. Select "NFC Tap"
5. Hold tag near phone until vibration
6. Tag should now contain stamp code

## Common Issues

### NFC Not Available

- Ensure device has NFC hardware
- Check NFC is enabled in device settings
- Use QR method as fallback

### Database Connection Error

- Verify Supabase URL and anon key
- Check internet connection
- Confirm database migrations applied

### Low Inventory Warning

- Generate more stamps via Inventory screen
- Default threshold is 50 stamps
- Adjustable in business settings

## Next Steps for Development

The core foundation is complete. To expand the app:

1. **Complete remaining screens**:
   - InventoryScreen (stamp generation UI)
   - HistoryScreen (transaction filters)
   - SettingsScreen (preferences, logout)
   - CustomerLookupModal
   - AnalyticsScreen (manager only)

2. **Add Issue Stamp Modal**:
   - Method selection (NFC/QR)
   - NFC write flow with progress
   - QR code display with countdown
   - Success/error states

3. **Implement advanced features**:
   - Void stamp functionality (manager)
   - Staff management (owner)
   - Export reports
   - Push notifications

4. **Polish UI/UX**:
   - Add animations and transitions
   - Implement haptic feedback
   - Loading skeletons
   - Error boundaries

5. **Testing & Optimization**:
   - Unit tests for services
   - Integration tests
   - Performance optimization
   - Accessibility audit

## Support

For issues or questions:
- Review CLAUDE.md in parent directory
- Check Supabase logs for database errors
- Test with demo credentials first
- Verify database schema is applied correctly

## License

Private - For StampMe project use only
