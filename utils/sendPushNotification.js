const admin = require("firebase-admin");
const serviceAccount = require("../config/serviceAccountKey.json");
const { User } = require("../models/User");

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
    data: payload.data || {},
    tokens: tokens,
  };

  try {
    const response = await admin.messaging().sendMulticast(message);

    response.responses.forEach(async (res, i) => {
      if (!res.success) {
        console.log("Invalid FCM token:", tokens[i]);

        // Auto-delete token from DB
        await User.updateMany(
          { fcmToken: tokens[i] },
          { $pull: { fcmToken: tokens[i] } }
        );
      }
    });

    return response;
  } catch (error) {
    console.error("FCM Error:", error);
  }
};


module.exports = {sendPushNotification};