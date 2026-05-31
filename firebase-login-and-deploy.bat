@echo off
echo ============================================
echo  KNOOTS - Firebase Login + Deploy Script
echo ============================================
echo.

cd /d "x:\SERVERS\KNOOTS"

echo [1/2] Logging into Firebase...
echo      A browser window will open. Sign in with your Google account.
echo.
firebase login

echo.
echo [2/2] Deploying Firestore security rules...
firebase deploy --only firestore:rules

echo.
echo ============================================
echo  Done! Firestore rules deployed.
echo ============================================
pause
