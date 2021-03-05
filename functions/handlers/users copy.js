const { admin, db, storageBucketRef } = require("../util/admin");

const config = require("../util/config");

const firebase = require("firebase");
firebase.initializeApp(config);

const {
  validateAddRegisterUser,
  validateLoginData,
  reduceUserDetails,
  validateDriverCommission,
  validateDriverSalary,
} = require("../util/validators");

//Register User
exports.registerUser = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
    role: req.body.role,
    fullName: req.body.fullName,
    createdby: req.user.handle,
    nic: req.body.nic,
  };

  if (req.body.role === "driver") {
    newUser.rfid = `knight_${(
      Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
    ).toUpperCase()}`;
    newUser.licenseNo = req.body.licenseNo;
  }

  const { valid, errors } = validateAddRegisterUser(newUser);

  if (!valid) return res.status(400).json(errors);

  const noImage = "no-img.png";

  let token;
  let userId;

  const newRFID = {
    active: false,
    drunken: false,
    handle: req.body.handle,
    location: new admin.firestore.GeoPoint(0, 0),
    tripId: "",
    login: false,
    hasPassenger: false,
    licenseNo: newUser.licenseNo,
    rfid: newUser.rfid,
  };

  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(401).json({ handle: "This handle is already taken" });
      }
      else {
        console.log("This is new user ");
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId: userId,
        role: newUser.role,
        fullname: newUser.fullName,
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImage}?alt=media`,
        createdby: newUser.createdby,
      };

      if (newUser.role == "driver") {
        userCredentials.rfid = newUser.rfid;
        userCredentials.licenseNo = newUser.licenseNo;

        //create RFID account
        db.doc(`driverlog/${newUser.rfid}`).set(newRFID);
      }

      db.doc(`users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res
        .status(201)
        .json({ token, message: `User ${userId} created sucessfully` });
    })
    .catch((err) => {
      if (err.code === "auth/email-already-in-use") {
        return res.status(402).json({ email: "Email is already is in use" });
      } else {
        return res
          .status(500)
          .json({ general: "Something went wrong please try again." });
      }
    });
};

//Login User
exports.loginUser = (req, res, next) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .then(() => {
      return next();
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ general: "Wrong Credentials, Please try again." });
      } else if (err.code === "auth/user-not-found") {
        return res.status(400).json({ general: "User NOT found!" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
};

//Upload user profile pricture
exports.uploadImageOwn = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encording, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }
    //image.png
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    imageFileName = `${Math.round(
      Math.random() * 100000000000
    )}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        return db.doc(`/users/${req.user.handle}`).get();
      })
      .then((doc) => {
        currentImageUrl = doc.data().imageUrl;
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      })
      .then(() => {
        fname = function (url) {
          return url
            ? url.split("/").pop().split("#").shift().split("?").shift()
            : null;
        };

        let imagefileName = fname(currentImageUrl);
        if (imagefileName !== "no-img.png") {
          storageBucketRef.file(imagefileName).delete();
        }

        return res.json({ message: "Image uploaded sucessfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  });
  busboy.end(req.rawBody);
};

//Upload user profile picture by admin or himself
exports.uploadImage = (req, res) => {
  const Busboy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new Busboy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};
  let currentImageUrl;

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }

    const imageExtention = filename.split(".")[filename.split(".").length - 1];
    imageFileName = `${Math.round(
      Math.random() * 10000000000
    )}.${imageExtention}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        return db.doc(`/users/${req.userProfile.handle}`).get();
      })
      .then((doc) => {
        currentImageUrl = doc.data().imageUrl;
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db.doc(`/users/${req.userProfile.handle}`).update({ imageUrl });
      })
      .then(() => {
        fname = function (url) {
          return url
            ? url.split("/").pop().split("#").shift().split("?").shift()
            : null;
        };

        let imagefileName = fname(currentImageUrl);
        if (imagefileName !== "no-img.png") {
          storageBucketRef.file(imagefileName).delete();
        }

        return res.json({ message: "Image uploaded sucessfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  });
  busboy.end(req.rawBody);
};

//Edit user Details by user
exports.editUserDetailsOwn = (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: "Details added sucessfully" });
    })
    .catch((err) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
};

//Edit user Details by admin
exports.editUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);
  db.doc(`/users/${req.userProfile.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: "Detail added successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//View all users anyone
exports.getAllUsers = (req, res) => {
  db.collection("users")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let users = {};
      users.drivers = [];
      users.staff = [];
      users.admin = [];

      data.forEach((doc) => {
        if (doc.data().role == "driver") {
          users.drivers.push({
            userId: doc.id,
            username: doc.id,
            name: doc.data().fullname,
            email: doc.data().email,
            phone: doc.data().phone,
            bio: doc.data().bio,
            address: doc.data().address,
            createdAt: doc.data().createdAt,
            imageUrl: doc.data().imageUrl,
            role: doc.data().role,
          });
        }

        if (doc.data().role == "staff") {
          users.staff.push({
            userId: doc.id,
            username: doc.id,
            name: doc.data().fullname,
            email: doc.data().email,
            phone: doc.data().phone,
            bio: doc.data().bio,
            address: doc.data().address,
            createdAt: doc.data().createdAt,
            imageUrl: doc.data().imageUrl,
            role: doc.data().role,
          });
        }

        if (doc.data().role == "admin") {
          users.admin.push({
            userId: doc.id,
            username: doc.id,
            name: doc.data().fullname,
            email: doc.data().email,
            phone: doc.data().phone,
            bio: doc.data().bio,
            imageUrl: doc.data().imageUrl,
            role: doc.data().role,
          });
        }
      });
      return res.json(users);
    })
    .catch((err) => console.error(err));
};

//View any user Details by anyone
exports.getUser = (req, res) => {
  let userData = {};
  userData.credentials = [];

  db.doc(`/users/${req.params.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        if (doc.data().role == "driver") {
          db.collection("ranking")
            .where("handle", "==", req.params.handle)
            .get()
            .then((data) => {
              userData.ranking = [];
              data.forEach((doc) => {
                userData.ranking.push(doc.data());
              });
              return res.json(userData);
            });
        } else {
          return res.json(userData);
        }
      }
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//Set User log
exports.setUserLog = (req, res) => {
  const setLog = {
    handle: req.params.handle,
    initialSalary: req.body.initialSalary,
    createdAt: new Date().toISOString(),
  };

  if (req.body.role == "driver") {
    setLog.ranking = req.body.ranking;
  }

  db.doc(`/userlog/${setLog.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        db.doc(`/userlog/${setLog.handle}`).update(setLog);
      } else {
        db.doc(`userlog/${setLog.handle}`).set(setLog);
      }
    })
    .then(() => {
      return res.json({ message: "Detail added successfully" });
    })
    .catch((err) => {
      res.status(500).json({ error: "Something went wrong" });
      console.error(err);
    });
};

//View User log by admin
exports.viewUserLog = (req, res) => {
  let userLogData = {};
  db.doc(`/userlog/${req.params.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userLogData = doc.data();
      }
    })
    .then(() => {
      return res.json(userLogData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//View driver status log by staff/admin
exports.getDriverStatusLog = (req, res) => {
  let userStatusData = {};
  db.doc(`/driverlog/${req.params.rfid}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userStatusData = doc.data();
      }
    })
    .then(() => {
      return res.json(userStatusData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//View driver commission
exports.getDriverCommission = (req, res) => {
  const user = {
    inputHandle: req.params.handle,
    inputYear: req.body.year,
    inputMonth: req.body.month,
  };

  const { valid, errors } = validateDriverCommission(user);

  if (!valid) return res.status(400).json(errors);

  let driverData = {};

  db.doc(`/users/${user.inputHandle}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Driver not found " });
      }
      driverData.userId = doc.id;
      if (user.inputMonth == null) {
        return db
          .collection("drivercommission")
          .orderBy("createdAt", "desc")
          .where("handle", "==", user.inputHandle)
          .where("year", "==", user.inputYear)
          .get();
      } else {
        return db
          .collection("drivercommission")
          .orderBy("createdAt", "desc")
          .where("handle", "==", user.inputHandle)
          .where("month", "==", user.inputMonth)
          .where("year", "==", user.inputYear)
          .get();
      }
    })
    .then((data) => {
      driverData.driverCommission = [];
      data.forEach((doc) => {
        driverData.driverCommission.push(doc.data());
      });
      return res.json(driverData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//View request customers
exports.getCustomerList = (req, res) => {
  let customersData = {};
  db.collection("customers")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      customersData.customer = [];
      data.forEach((doc) => {
        customersData.customer.push(doc.data());
      });
      return res.json(customersData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.calculateDriverSalary = (req, res) => {
  const user = {
    handle: req.params.handle,
    inputYear: req.body.year, //web fixed month and year right now
    inputMonth: req.body.month,
  };

  const { valid, errors } = validateDriverSalary(user);

  if (!valid) return res.status(400).json(errors);

  let driverData = {};

  db.doc(`/users/${user.handle}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "User not found " });
      }
      driverData.userId = doc.id;
      if (doc.data().role == "driver") {
        return db
          .collection("drivercommission")
          .orderBy("createdAt", "desc")
          .where("handle", "==", user.handle)
          .where("month", "==", user.inputMonth)
          .where("year", "==", user.inputYear)
          .get();
      } else {
        return res.json({ message: "User is not a Driver" });
      }
    })
    .then((data) => {
      driverData.driverCommission = [];
      data.forEach((doc) => {
        driverData.driverCommission.push(doc.data());
      });
    })
    .then(() => {
      db.doc(`/userlog/${user.handle}`)
        .get()
        .then((doc) => {
          driverData.initialSalary = doc.data().initialSalary;
          return res.json(driverData);
        });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.getAllUserss = (req, res) => {
  db.collection("users")
    .get()
    .then((data) => {
      let users = [];
      //users.user = [];
      data.forEach((doc) => {
        users.push({
          userId: doc.id,
          username: doc.id,
          name: doc.data().fullname,
          email: doc.data().email,
          phone: doc.data().phone,
          bio: doc.data().bio,
          address: doc.data().address,
          createdAt: doc.data().createdAt,
          imageUrl: doc.data().imageUrl,
          role: doc.data().role,
        });
      });
      return res.json(users);
    })
    .catch((err) => console.error(err));
};

//Get own user Details
exports.getUserOwn = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
      }
      return res.json(userData);
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
};
