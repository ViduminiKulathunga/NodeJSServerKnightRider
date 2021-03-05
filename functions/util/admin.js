const admin = require("firebase-admin");


const serviceAccount = require("../keys/knight-rider-cabs-firebase-adminsdk-ce72x-73bbe7964f.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://knight-rider-cabs.firebaseio.com",
  storageBucket: "knight-rider-cabs.appspot.com",
});

const db = admin.firestore();
const storageBucketRef = admin.storage().bucket();

module.exports = {admin, db, storageBucketRef};