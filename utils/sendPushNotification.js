const admin = require("firebase-admin");
const serviceAccount = require("../config/serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const sendPushNotification = async (tokens, payload) => {
    const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    tokens: tokens,
  };

  try {
    const response = await admin.messaging().sendMulticast(message);

    // Remove invalid tokens
    response.responses.forEach((res, i) => {
      if (!res.success) {
        console.log("Invalid FCM token:", tokens[i]);
      }
    });

    return response;
  } catch (error) {
    console.error("FCM Error:", error);
  }
};

module.exports = {sendPushNotification};