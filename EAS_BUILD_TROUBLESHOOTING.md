# EAS Build Troubleshooting Guide

## Issue: "Could not find MIME for Buffer" Error

This error occurs when EAS prebuild can't process image assets (icon, splash screen, adaptive icon, notification icon).

## Solutions Applied

### 1. ✅ Removed Problematic Image References
We removed references to potentially corrupted images:
- Removed `icon` from main expo config
- Removed `splash.image` reference
- Removed `adaptiveIcon` from Android config
- Removed `expo-notifications` plugin with custom icon
- Removed `favicon` from web config

### 2. ✅ Cleaned Native Directories
Removed any cached `android/` and `ios/` folders that might have corrupted state.

### 3. ✅ Simplified Configuration
Updated `app.json` to use minimal configuration that won't trigger image processing errors.

---

## Current Build Command

```bash
eas build --profile development --platform android
```

This builds on EAS cloud servers (not local) because you're on Windows.

---

## What to Do Next

### Option 1: Wait for Current Build
The build is now running on EAS cloud. You can:

1. **Check build status:**
   ```bash
   eas build:list
   ```

2. **View build logs:**
   - Go to https://expo.dev
   - Sign in
   - Click on your project
   - Click "Builds" tab
   - Watch the live logs

### Option 2: If Build Fails Again

If you still get the MIME error, try:

1. **Recreate image assets:**
   ```bash
   npx expo prebuild --clean
   ```

2. **Use default Expo assets temporarily:**
   - Delete the `assets/` folder
   - Let Expo generate default icons

3. **Check image files:**
   - Make sure all PNG files in `assets/` are valid
   - Try opening each one to verify they're not corrupted
   - Re-export them from an image editor if needed

---

## Alternative: Build Without Development Client

If you just need to test the app quickly (without NFC), you can build a preview version:

```bash
eas build --profile preview --platform android
```

This creates a standalone APK that doesn't require Expo Go.

---

## After Successful Build

Once the build completes:

1. **Download the APK:**
   ```bash
   eas build:list
   # Copy the build ID from the list
   
   # Or download from Expo dashboard
   ```

2. **Install on Android device:**
   - Download APK from Expo dashboard
   - Transfer to your Android phone
   - Enable "Install from Unknown Sources"
   - Install the APK

3. **Test NFC:**
   - Open the app
   - Go to Scan screen
   - Switch to NFC mode
   - Tap the "Tap to Scan NFC" button
   - Hold phone near NFC tag

---

## Restore Icons Later (Optional)

After the app builds successfully, you can add icons back gradually:

1. **Test each image:**
   ```bash
   # Verify PNG files are valid
   file assets/icon.png
   file assets/splash.png
   ```

2. **Add one at a time:**
   - Add `icon` first, rebuild
   - Add `splash.image` next, rebuild
   - Add `adaptiveIcon` last, rebuild

3. **Use this as final config:**
   ```json
   {
     "expo": {
       "icon": "./assets/icon.png",
       "splash": {
         "image": "./assets/splash.png",
         "resizeMode": "contain",
         "backgroundColor": "#007BFF"
       },
       "android": {
         "adaptiveIcon": {
           "foregroundImage": "./assets/adaptive-icon.png",
           "backgroundColor": "#007BFF"
         }
       }
     }
   }
   ```

---

## Common Build Commands

```bash
# Check build status
eas build:list

# Cancel current build
eas build:cancel

# Build for Android (development)
eas build --profile development --platform android

# Build for Android (production)
eas build --profile production --platform android

# Build for both platforms
eas build --profile development --platform all

# View credentials
eas credentials
```

---

## Understanding Build Profiles

Your `eas.json` has 3 profiles:

### `development`
- Creates development build with Expo DevTools
- Requires development client (custom native build)
- Can use NFC and other native modules
- Larger file size (~100MB)

### `preview`
- Creates standalone app for internal testing
- No development tools included
- Smaller than development build
- Good for beta testing

### `production`
- Creates release-ready app for Google Play
- Optimized and minified
- Smallest file size
- Ready for store submission

---

## Expected Build Time

- **Development build**: 10-20 minutes
- **Preview/Production**: 8-15 minutes

You'll get an email when it completes!

---

## Testing on Device

### With Development Build:
1. Install the APK from EAS
2. Open the app
3. Shake device → opens Expo DevTools
4. Can reload, debug, etc.

### With Preview/Production Build:
1. Install the APK
2. App runs standalone
3. No DevTools available
4. Closer to production experience

---

## Next Steps for NFC Security

Once your app builds and installs successfully:

1. Follow `NFC_SECURITY_SETUP_GUIDE.md` to set up the backend
2. Use the Tag Provisioning Tool to create encrypted tags
3. Test scanning tags with the new secure flow

---

## Need Help?

**Check build logs:**
```bash
eas build:view BUILD_ID
```

**Or online:**
https://expo.dev → Your Project → Builds

**Common errors:**
- "Could not find MIME" → Image corruption (fixed above)
- "Android SDK not found" → Use cloud build (not --local on Windows)
- "Build credentials missing" → Run `eas credentials`
