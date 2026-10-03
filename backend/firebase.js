const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const keyPath = path.isAbsolute(process.env.FIREBASE_KEY_PATH)
  ? process.env.FIREBASE_KEY_PATH
  : path.resolve(__dirname, process.env.FIREBASE_KEY_PATH);

let bucket = null;
if (fs.existsSync(keyPath)) {
  admin.initializeApp({
    credential: admin.credential.cert(require(keyPath)),
    storageBucket: process.env.FIREBASE_BUCKET,
  });
  bucket = admin.storage().bucket();
  console.log('Firebase Admin ready');
} else {
  console.warn('[firebase] serviceAccountKey.json not found - running in DEV mode (no token verification)');
}
module.exports = { admin, bucket, enabled: !!bucket || admin.apps.length > 0 };
