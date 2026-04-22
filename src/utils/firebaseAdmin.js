const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

exports.verifyFirebaseToken = async (token) => {
  const decoded = await admin.auth().verifyIdToken(token);
  return decoded;
};