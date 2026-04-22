const admin = require('firebase-admin');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

let initialized = false;

const initializeFirebase = async () => {
  if (initialized || admin.apps.length) return;

  const client = new SecretsManagerClient({ region: 'ap-south-1' });
  
  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: 'cosmic-virtue/firebase-service-account',
    })
  );

  const serviceAccount = JSON.parse(response.SecretString);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  initialized = true;
};

exports.verifyFirebaseToken = async (token) => {
  await initializeFirebase();
  const decoded = await admin.auth().verifyIdToken(token);
  return decoded;
};