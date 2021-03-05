const functions = require("firebase-functions");
const app = require("express")();
const { db } = require("./util/admin");
const { ROLE } = require("./util/data");
const {
  authUser,
  authRole,
  setUserProfile,
  authUploadImage,
  authEditDetails,
  authViewProfile,
} = require("./util/fbAuth");

const {
  getAllUsers,
  registerUser,
  loginUser,
  uploadImageOwn,
  uploadImage,
  editUserDetailsOwn,
  editUserDetails,
  getDriverStatusLog,
  getUser,
  setUserLog,
  viewUserLog,
  getDriverCommission,
  getCustomerList,
  calculateDriverSalary,
  getAllUserss,
  getUserOwn,
  deleteUser,
} = require("./handlers/users");

const {
  setProfile,
  locationOnTrip,
  getDriverLocation,
  getDriverAlcoholStatus,
  postATrip,
  startTour,
  endtTour,
  getTripStatus,
  postDriverCommision,
  viewDriverPerformance,
} = require("./handlers/drivers");

const { postAlcohol, putAlcohol } = require("./handlers/alcohol");

//Alcohol Routes
//app.post("/alcohol", postAlcohols);
app.put("/alcohol/:id", postAlcohol);

//User Routes
app.get("/users", authUser, getAllUsers);
app.get("/userss", getAllUserss);
app.get("/user/:handle", authUser, getUser);
app.get("/userinfo", authUser, getUserOwn);
app.get("/userlog/:handle", authUser, authRole(ROLE.ADMIN), viewUserLog);
app.get(
  "/driverperformance",
  authUser,
  authRole(ROLE.ADMIN),
  viewDriverPerformance
);

app.post("/registeruser", authUser, authRole(ROLE.ADMIN), registerUser);
app.post("/login", loginUser);
app.post("/user/image", authUser, uploadImageOwn);
app.post(
  "/user/:handle/image",
  setUserProfile,
  authUser,
  authUploadImage,
  uploadImage
);
app.post("/user", authUser, editUserDetailsOwn);
app.post(
  "/user/:handle",
  setUserProfile,
  authUser,
  authEditDetails,
  editUserDetails
);
app.post("/userlog/:handle", authUser, authRole(ROLE.ADMIN), setUserLog);
app.delete("/user/:handle", authUser, authRole(ROLE.ADMIN), deleteUser);

//**Special Routes**
//Driver Routes
app.get("/welcome", authUser, authRole(ROLE.DRIVER), setProfile);
app.get("/drivers/:rfid", authUser, authViewProfile, getDriverStatusLog);
app.get(
  "/driver/:handle/commission",
  authUser,
  authRole(ROLE.ADMIN),
  getDriverCommission
);
app.get(
  "/driver/:rfid/location",
  authUser,
  authRole(ROLE.ADMIN),
  getDriverLocation
);
app.get("/customers", authUser, getCustomerList);
app.get("/tripstatus/:tripId", authUser, authRole(ROLE.DRIVER), getTripStatus);
app.get(
  "/driver/:month/:year/salary",
  authUser,
  authRole(ROLE.ADMIN),
  calculateDriverSalary
);
app.get(
  "/driver/:handle/:month/:year/alcohol",
  authUser,
  authViewProfile,
  getDriverAlcoholStatus
);
app.post("/driver/location", authUser, authRole(ROLE.DRIVER), locationOnTrip); // Update location
app.post("/trip", authUser, authRole(ROLE.DRIVER), postATrip);
app.post("/start/:tripId", authUser, authRole(ROLE.DRIVER), startTour);
app.post("/end/:tripId", authUser, authRole(ROLE.DRIVER), endtTour);
app.post(
  "/driver/:tripId",
  authUser,
  authRole(ROLE.DRIVER),
  postDriverCommision
);

exports.api = functions.region("us-central1").https.onRequest(app);

//Alcohol change status log
exports.onAlcoholChange = functions
  .region("us-central1")
  .firestore.document("/driverlog/{rfid}")
  .onUpdate((change) => {
    let recentHasPassenger = change.after.data().hasPassenger;
    let alcoholStatusPendingTrip = false;
    let alcoholStatusPendingTripId = "";
    let alcoholGeneratedDocumnet = "";

    if (
      change.before.data().drunken !== change.after.data().drunken &&
      change.after.data().drunken === true
    ) {
      const alcoholStatus = {
        createdAt: new Date().toISOString(),
        drunken: true,
        handle: change.before.data().handle,
        tripId: change.before.data().tripId,
        month: new Date().toLocaleString("en-us", { month: "long" }),
        year: new Date().getFullYear().toString(),
      };

      let rfid = change.before.data().rfid;

      setTimeout(() => {
        db.doc(`/driverlog/${rfid}`)
          .update({
            drunken: false,
          })
          .then(() => {
            if (recentHasPassenger === true) {
              db.doc(`/driverlog/${rfid}`)
                .get()
                .then((doc) => {
                  if (doc.exists) {
                    recentLogin = doc.data().login;
                    checkHasPassenger = doc.data().hasPassenger;

                    if (recentLogin === false) {
                      return db
                        .doc(`/driverlog/${rfid}`)
                        .update({
                          status: "logout",
                        })
                        .catch((err) => {
                          console.error(err);
                        });
                    } else {
                      return db
                        .doc(`/driverlog/${rfid}`)
                        .update({
                          status: "hasPassenger",
                          active: true,
                        })
                        .catch((err) => {
                          console.error(err);
                        });
                    }
                  }
                })
                .catch((err) => {
                  console.error(err);
                  return true;
                });
            } else if (recentHasPassenger === false) {
              let rfid = change.before.data().rfid;

              let recentLogin = "";
              let checkHasPassenger = "";

              db.doc(`/driverlog/${rfid}`)
                .get()
                .then((doc) => {
                  if (doc.exists) {
                    recentLogin = doc.data().login;
                    checkHasPassenger = doc.data().hasPassenger;
                    checkHasPassengerTripId = doc.data().tripId;
                    alcoholStatusPendingTrip = checkHasPassenger;
                    alcoholStatusPendingTripId = checkHasPassengerTripId;

                    if (recentLogin === false) {
                      return db
                        .doc(`/driverlog/${rfid}`)
                        .update({
                          status: "logout",
                        })
                        .catch((err) => {
                          console.error(err);
                        });
                    } else if (checkHasPassenger === true) {
                      return db
                        .doc(`/driverlog/${rfid}`)
                        .update({
                          status: "hasPassenger",
                        })
                        .then(() => {
                          db.doc(`/alcohol/${alcoholGeneratedDocumnet}`).update(
                            {
                              tripId: alcoholStatusPendingTripId,
                            }
                          );
                        })
                        .then(() => {
                          db.doc(`/trip/${alcoholStatusPendingTripId}`).update({
                            drunken: true,
                            alcoholID: alcoholGeneratedDocumnet,
                          });
                        })
                        .catch((err) => {
                          console.error(err);
                        });
                    } else {
                      return db
                        .doc(`/driverlog/${rfid}`)
                        .update({
                          status: "login",
                        })
                        .catch((err) => {
                          console.error(err);
                        });
                    }
                  }
                })
                .catch((err) => {
                  console.error(err);
                  return true;
                });
            } else {
              return true;
            }
          })
          .catch((err) => {
            console.error(err, " Error new line");
          });
      }, 120000); // 2 minute delay

      return db
        .collection("alcohol")
        .add(alcoholStatus)
        .then((docRef) => {
          alcoholGeneratedDocumnet = docRef.id;
        })
        .then(() => {
          return db.doc(`/driverlog/${rfid}`).update({
            status: "drunken",
            alcoholID: alcoholGeneratedDocumnet,
          });
        })
        .then(() => {
          if (alcoholStatus.tripId !== "") {
            return db.doc(`/trip/${alcoholStatus.tripId}`).update({
              drunken: true,
              alcoholID: alcoholGeneratedDocumnet,
            });
          } else {
            return;
          }
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      return true;
    }
  });

//Alcohol change in status log, After a Trip
exports.onAlcoholChangeTrip = functions
  .region("us-central1")
  .firestore.document("/driverlog/{rfid}")
  .onUpdate((change) => {
    let recentTripId = change.before.data().tripId;
    let recentAlcoholID = change.before.data().alcoholID;

    if (
      change.before.data().hasPassenger !== change.after.data().hasPassenger &&
      change.after.data().drunken === true &&
      change.after.data().hasPassenger === false
    ) {
      return db
        .doc(`/trip/${recentTripId}`)
        .update({
          drunken: true,
          alcoholID: recentAlcoholID,
        })
        .then(() => {
          return db.doc(`/alcohol/${recentAlcoholID}`).update({
            tripId: recentTripId,
          });
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      return true;
    }
  });

//Alcohol change in status log, After a Trip
exports.onLoginChange = functions
  .region("us-central1")
  .firestore.document("/driverlog/{rfid}")
  .onUpdate((change) => {
    let rfidDriver = change.before.data().rfid;
    // let recentAlcoholID = change.before.data().alcoholID;

    if (
      change.before.data().login !== change.after.data().login &&
      change.after.data().login === true &&
      change.before.data().drunken === true
    ) {
      return db
        .doc(`/driverlog/${rfidDriver}`)
        .update({
          status: "drunken",
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      return true;
    }
  });

//Alcohol change in status log, After a Trip
exports.onActiveChange = functions
  .region("us-central1")
  .firestore.document("/driverlog/{rfid}")
  .onUpdate((change) => {
    let rfidDriver = change.before.data().rfid;
    // let recentAlcoholID = change.before.data().alcoholID;

    if (
      change.before.data().active !== change.after.data().active &&
      change.after.data().active === true &&
      change.before.data().drunken === true
    ) {
      return db
        .doc(`/driverlog/${rfidDriver}`)
        .update({
          status: "drunken",
          active: false,
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      return true;
    }
  });

//Alcohol change in status log, After a Trip
exports.onActiveChangeBeforeLogin = functions
  .region("us-central1")
  .firestore.document("/driverlog/{rfid}")
  .onUpdate((change) => {
    let rfidDriver = change.before.data().rfid;
    // let recentAlcoholID = change.before.data().alcoholID;

    if (
      change.before.data().active !== change.after.data().active &&
      change.after.data().active === true &&
      change.before.data().login === false
    ) {
      return db
        .doc(`/driverlog/${rfidDriver}`)
        .update({
          status: "logout",
          active: false,
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      return true;
    }
  });

//Status Change //Status - hasPassenger
exports.onStatusChange = functions
  .region("us-central1")
  .firestore.document("/driverlog/{rfid}")
  .onUpdate((change) => {
    if (
      change.before.data().hasPassenger !== change.after.data().hasPassenger &&
      change.after.data().hasPassenger === true &&
      change.after.data().drunken === false
    ) {
      let rfid = change.before.data().rfid;

      return db
        .doc(`/driverlog/${rfid}`)
        .update({
          status: "hasPassenger",
        })
        .catch((err) => {
          console.error(err);
        });
    } else if (
      change.before.data().hasPassenger !== change.after.data().hasPassenger &&
      change.after.data().hasPassenger === false &&
      change.before.data().active === true
    ) {
      let rfid = change.before.data().rfid;

      return db
        .doc(`/driverlog/${rfid}`)
        .update({
          status: "active",
        })
        .catch((err) => {
          console.error(err);
        });
    } else if (
      change.before.data().active !== change.after.data().active &&
      change.after.data().active === true &&
      change.after.data().drunken === false &&
      change.after.data().hasPassenger === false
    ) {
      let rfid = change.before.data().rfid;

      return db
        .doc(`/driverlog/${rfid}`)
        .update({
          status: "active",
        })
        .catch((err) => {
          console.error(err);
        });
    } else if (
      change.before.data().login !== change.after.data().login &&
      change.after.data().login === true &&
      change.after.data().drunken === false &&
      change.after.data().active === false
    ) {
      let rfid = change.before.data().rfid;

      return db
        .doc(`/driverlog/${rfid}`)
        .update({
          status: "login",
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      return true;
    }
  });

exports.onUserDelete = functions
  .region("us-central1")
  .firestore.document("/users/{handle}")
  .onDelete((snapshot, context) => {
    const userHandle = context.params.handle;
    const batch = db.batch();
    return db
      .collection("userlog")
      .where("handle", "==", userHandle)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/userlog/${doc.id}`));
        });
        return db.collection("trip").where("handle", "==", userHandle).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/trip/${doc.id}`));
        });
        return db
          .collection("location")
          .where("handle", "==", userHandle)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/location/${doc.id}`));
        });
        return db
          .collection("driverlog")
          .where("handle", "==", userHandle)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/driverlog/${doc.id}`));
        });
        return db
          .collection("drivercommission")
          .where("handle", "==", userHandle)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/drivercommission/${doc.id}`));
        });
        return db.collection("alcohol").where("handle", "==", userHandle).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/alcohol/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => console.error(err));
  });
