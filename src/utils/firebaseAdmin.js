const admin = require('firebase-admin');
const path = require('path');

// Load the service account JSON file directly (for local development)
const serviceAccount = require(path.join(__dirname, '../config/firebase-service-account.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

exports.verifyFirebaseToken = async (token) => {
  const decoded = await admin.auth().verifyIdToken(token);
  return decoded;
};
