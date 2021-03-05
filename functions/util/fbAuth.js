const { admin, db } = require("./admin");
const { canUploadImage, canEditDetails, canViewProfile } = require("../permissions/profile");

const authUser = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.log("No Token Found");
    return res.status(403).json({ error: "Unauthorized" });
  }

  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      return db
        .collection("users")
        .where("userId", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      req.user = data.docs[0].data();
      req.user.handle = data.docs[0].data().handle;
      req.user.role = data.docs[0].data().role;
      return next();
    })
    .catch((err) => {
      console.error("Error while verifying token", err);
      return res.status(403).json(err);
    });
};

const authRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(401).json({ error: "Not allowed!" });
    }
    next();
  };
};

const setUserProfile = (req, res, next) => {
  const userHandle = req.params.handle;
  db.doc(`/users/${userHandle}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Profile not Found " });
      }
      req.userProfile = doc.data();
      req.userProfile.imageUrl = doc.data().imageUrl;
      req.userProfile.handle = doc.data().handle;
    })
    .then(() => {
      return next();
    })
    .catch((err) => {
      res.status(500).json({ error: err.code });
      console.error(err);
    });
};

const authUploadImage = (req, res, next) => {
  if (!canUploadImage(req.user, req.userProfile)) {
    res.status(401);
    return res.send("Not Allowed");
  }
  next();
};

const authEditDetails = (req, res, next) => {
  if (!canEditDetails(req.user, req.setUserProfile)) {
    res.status(401);
    return res.send("Not Allowed");
  }
  next();
};

const authViewProfile = (req, res, next) => {
  if (!canViewProfile(req.user)) {
    res.status(401);
    return res.send("Not Allowed");
  }
  next();
};

module.exports = {
  authUser,
  authRole,
  setUserProfile,
  authUploadImage,
  authEditDetails,
  authViewProfile,
};
