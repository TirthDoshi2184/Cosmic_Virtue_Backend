const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

exports.verifyFirebaseToken = async (token) => {
  const decoded = await admin.auth().verifyIdToken(token);
  return decoded;
};

if (window.location.hostname === 'localhost') {
  auth.settings.appVerificationDisabledForTesting = true;
}