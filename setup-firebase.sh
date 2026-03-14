#!/bin/bash
# Firebase project setup script for EasyOriginals.
# Run this interactively: bash setup-firebase.sh
#
# Prerequisites: npm install -g firebase-tools
# Then: firebase login

set -e

echo "=== EasyOriginals Firebase Setup ==="
echo ""

# Check firebase CLI
if ! command -v firebase &> /dev/null; then
  echo "Error: firebase CLI not found. Install it: npm install -g firebase-tools"
  exit 1
fi

# Check login
if ! firebase login:list 2>&1 | grep -q "@"; then
  echo "Not logged in. Running: firebase login"
  firebase login
fi

PROJECT_ID="easyoriginals-$(openssl rand -hex 4)"
echo ""
echo "Creating Firebase project: $PROJECT_ID"

# Create project
firebase projects:create "$PROJECT_ID" --display-name "EasyOriginals" 2>&1 || {
  echo "Failed to create project. You may need to create it manually at https://console.firebase.google.com"
  read -p "Enter your Firebase project ID: " PROJECT_ID
}

# Create web app
echo "Creating web app..."
firebase apps:create web "EasyOriginals Web" --project "$PROJECT_ID" 2>&1

# Get the config
echo "Fetching config..."
CONFIG_JSON=$(firebase apps:sdkconfig web --project "$PROJECT_ID" 2>&1)

# Extract values
API_KEY=$(echo "$CONFIG_JSON" | grep -o '"apiKey": "[^"]*"' | head -1 | cut -d'"' -f4)
AUTH_DOMAIN=$(echo "$CONFIG_JSON" | grep -o '"authDomain": "[^"]*"' | head -1 | cut -d'"' -f4)
PROJECT_ID_VAL=$(echo "$CONFIG_JSON" | grep -o '"projectId": "[^"]*"' | head -1 | cut -d'"' -f4)
STORAGE_BUCKET=$(echo "$CONFIG_JSON" | grep -o '"storageBucket": "[^"]*"' | head -1 | cut -d'"' -f4)
MESSAGING_ID=$(echo "$CONFIG_JSON" | grep -o '"messagingSenderId": "[^"]*"' | head -1 | cut -d'"' -f4)
APP_ID=$(echo "$CONFIG_JSON" | grep -o '"appId": "[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$API_KEY" ]; then
  echo "Error: Could not extract config. Please update src/firebase-init.js manually."
  echo "Raw output:"
  echo "$CONFIG_JSON"
  exit 1
fi

# Update firebase-init.js
cat > src/firebase-init.js << JSEOF
/**
 * Firebase initialization module.
 * Centralizes Firebase app, auth, and firestore setup.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "${API_KEY}",
  authDomain: "${AUTH_DOMAIN}",
  projectId: "${PROJECT_ID_VAL}",
  storageBucket: "${STORAGE_BUCKET}",
  messagingSenderId: "${MESSAGING_ID}",
  appId: "${APP_ID}"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };
export { doc, setDoc, getDoc };
JSEOF

echo ""
echo "✅ Firebase config written to src/firebase-init.js"
echo ""
echo "Next steps:"
echo "1. Go to https://console.firebase.google.com/project/${PROJECT_ID_VAL}/authentication/providers"
echo "   → Enable 'Email/Password' sign-in method"
echo "2. Go to https://console.firebase.google.com/project/${PROJECT_ID_VAL}/firestore"
echo "   → Click 'Create database' → Start in test mode"
echo "3. Run: npm run build && npm run preview"
echo ""
