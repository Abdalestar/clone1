# StampMe Staff App - Testing Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Your Supabase database is connected and migrations applied ✅

### Installation & Launch

1. **Navigate to staff app directory:**
   ```bash
   cd staff-app
   ```

2. **Dependencies are already installed** ✅
   - If you need to reinstall: `npm install`

3. **Start the development server:**
   ```bash
   npm start
   ```

   This will open the Expo DevTools in your browser.

4. **Choose your testing platform:**

   **Option A: Web Browser (Easiest)**
   - Press `w` in the terminal (or click "Run in web browser")
   - App will open at `http://localhost:8081`
   - Perfect for UI testing and development

   **Option B: Mobile Device via Expo Go**
   - Install "Expo Go" app from App Store or Google Play
   - Scan the QR code shown in terminal
   - Best for testing mobile-specific features

   **Option C: iOS Simulator (macOS only)**
   - Press `i` in the terminal
   - Requires Xcode installed

   **Option D: Android Emulator**
   - Press `a` in the terminal
   - Requires Android Studio installed

## 🔐 Demo Credentials

- **Email**: `staff@demo.com`
- **PIN**: `1234`
- **Role**: Manager (full permissions)

## 🧪 Testing Checklist

### 1. Login Screen Testing

**What to Test:**
- [ ] PIN keypad displays correctly
- [ ] Dots fill as you type each digit
- [ ] Auto-submits after 4th digit
- [ ] Shows loading spinner during authentication
- [ ] Shake animation on wrong PIN (try: 9999)
- [ ] Successful login navigates to dashboard

**Test Cases:**
1. **Valid Login**: Enter `1234` → Should see dashboard
2. **Invalid Login**: Enter `9999` → Should shake and clear PIN
3. **Partial PIN**: Enter `12` then backspace → Dots should update

### 2. Home Dashboard Testing

**What to Test:**
- [ ] Greeting shows staff name: "Hello, Demo Staff"
- [ ] Role badge shows "manager"
- [ ] Giant green "ISSUE STAMP" button displays
- [ ] Stats cards show:
  - Stamps issued today
  - Customers served today
  - Rewards redeemed today
  - Available stamps
- [ ] Pull-to-refresh works (swipe down)
- [ ] Recent activity feed displays (if any transactions exist)

**Expected Behavior:**
- Stats should load from your database
- If no activity today, counters will show 0
- If inventory < 50, orange warning banner appears

**Test Cases:**
1. **First Load**: Dashboard should load within 2-3 seconds
2. **Refresh**: Pull down → Stats should refresh
3. **Issue Stamp Button**: Tap → Console log "Issue Stamp clicked"
4. **Generate Button** (if low inventory warning shows): Tap → Console log "Generate Stamps clicked"

### 3. Navigation Testing

**What to Test:**
- [ ] Bottom tab bar shows 4 tabs: Home, Inventory, History, Settings
- [ ] Tab icons display: 🏠 📦 📊 ⚙️
- [ ] Active tab highlights in blue (#1976D2)
- [ ] Inactive tabs show gray (#757575)
- [ ] Tapping each tab switches view (currently all show HomeScreen)

**Note**: Other screens (Inventory, History, Settings) are placeholders showing the HomeScreen. This is expected - they need to be built.

## 🔍 What to Look For

### Visual Quality Checklist
- [ ] No visual glitches or broken layouts
- [ ] Colors match design (blue primary, green CTA)
- [ ] Text is readable and properly sized
- [ ] Buttons have proper touch feedback
- [ ] Spacing is consistent
- [ ] No console errors (check browser DevTools)

### Performance Checklist
- [ ] App loads in < 5 seconds
- [ ] PIN keypad is responsive (no lag)
- [ ] Dashboard loads stats quickly
- [ ] Smooth animations (no jank)
- [ ] Pull-to-refresh is smooth

### Functionality Checklist
- [ ] Authentication works
- [ ] Session persists (close/reopen app → still logged in)
- [ ] Data loads from Supabase
- [ ] No JavaScript errors in console

## 🐛 Common Issues & Solutions

### Issue: "Metro bundler not starting"
**Solution:**
```bash
# Clear cache and restart
npx expo start --clear
```

### Issue: "Module not found" errors
**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Cannot connect to Supabase"
**Check:**
1. Your Supabase URL in `src/services/supabase.ts`
2. Internet connection
3. Supabase project is active
4. Database migrations applied

**Verify Database:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM staff_members WHERE email = 'staff@demo.com';
```
Should return 1 row with Demo Staff.

### Issue: "Stats showing 0"
**Expected Behavior:** This is normal if:
- No stamps issued today
- Fresh database with no transactions

**To Test with Data:**
```sql
-- Run in Supabase SQL Editor to generate test stamps
SELECT generate_one_time_stamps(
  (SELECT id FROM businesses LIMIT 1),
  100,
  1440
);
```

### Issue: "Low inventory warning not showing"
**Solution:** Generate more stamps to get > 50 available, or adjust threshold.

### Issue: Web app won't load
**Check:**
1. Port 8081 is not in use: `lsof -i :8081`
2. Clear browser cache
3. Try incognito/private browsing

## 📱 Platform-Specific Notes

### Web (Recommended for Testing)
- ✅ Full UI testing possible
- ✅ Fast reload
- ✅ Browser DevTools available
- ❌ No NFC functionality (requires native device)
- ❌ Some mobile-specific features may not work

### Mobile (Expo Go)
- ✅ Test real mobile experience
- ✅ Gestures and haptics work
- ❌ NFC requires custom development build
- ❌ Slightly slower reload

### iOS/Android Emulator
- ✅ Close to real device
- ✅ Test platform-specific behavior
- ❌ Slower than web
- ❌ NFC still requires physical device

## 🔐 Security Testing

### Test Session Management
1. Login successfully
2. Close app/browser tab
3. Reopen → Should still be logged in
4. Wait 24 hours → Session should expire, require re-login

### Test PIN Security
1. Enter wrong PIN 3 times
2. Should show error each time
3. PIN should clear after each failed attempt

## 📊 Database Verification

### Check Staff Member Exists
```sql
SELECT
  name,
  email,
  role,
  is_active,
  last_login_at
FROM staff_members
WHERE email = 'staff@demo.com';
```

### Check Available Stamps
```sql
SELECT COUNT(*) as available_stamps
FROM one_time_stamps
WHERE status = 'active'
AND expires_at > NOW()
AND issued_by_staff_id IS NULL;
```

### Check Today's Stats
```sql
SELECT
  transaction_type,
  COUNT(*) as count
FROM stamp_transactions
WHERE merchant_id IN (SELECT merchant_id FROM staff_members WHERE email = 'staff@demo.com')
AND created_at >= CURRENT_DATE
GROUP BY transaction_type;
```

## 🎯 Next Steps After Testing

Once you've verified the core functionality works:

1. **Test Issue Stamp Flow** (when modal built)
2. **Test Inventory Generation**
3. **Test Transaction History**
4. **Test on Physical Device** (for NFC)
5. **Load Test** with multiple staff members

## 💡 Pro Tips

### Enable Debug Logging
Open browser console (F12) to see:
- Authentication attempts
- API calls to Supabase
- Navigation events
- Button clicks

### Test Offline Behavior
1. Login successfully
2. Disable network in DevTools
3. Try refreshing dashboard → Should handle gracefully
4. Re-enable network → Should auto-sync

### Hot Reload
- Save any file in `src/` → App auto-reloads
- Fast development cycle
- Keep console open to see updates

## 📞 Getting Help

### Check Logs
- **Browser Console**: F12 → Console tab
- **Expo Logs**: Terminal where you ran `npm start`
- **Supabase Logs**: Supabase Dashboard → Logs

### Verify Setup
```bash
# Check Node version (should be 18+)
node --version

# Check npm version
npm --version

# Check if expo is working
npx expo --version

# Verify TypeScript compiles
npx tsc --noEmit
```

## ✅ Success Criteria

Your Staff App is working correctly if:
- ✅ Login with demo PIN succeeds
- ✅ Dashboard displays without errors
- ✅ Stats load from database
- ✅ Navigation tabs work
- ✅ Pull-to-refresh updates data
- ✅ No console errors
- ✅ App is responsive and smooth

## 🎉 You're Ready!

If all checklist items pass, your Staff App foundation is working perfectly. You can now:
1. Use it as-is for testing UI/UX
2. Build the Issue Stamp modal next
3. Complete remaining screens (Inventory, History, Settings)
4. Add real-time features
5. Deploy to production

---

**Need More Help?**
- Review `README.md` for setup details
- Check `STAFF_APP_IMPLEMENTATION_SUMMARY.md` for architecture
- Verify database schema in migration files

Happy Testing! 🚀
