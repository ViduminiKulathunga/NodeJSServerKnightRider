const functions = require("firebase-functions");
const admin = require("firebase-admin");
const app = require("express")();

const serviceAccount = require("./keys/knight-rider-cabs-firebase-adminsdk-ce72x-73bbe7964f.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://knight-rider-cabs.firebaseio.com",
});

const firebaseConfig = {
  credential: admin.credential.cert(serviceAccount),
  apiKey: "AIzaSyC79EBEgrIGKpJH1EJY37Dcn2Uo6OwVcFk",
  authDomain: "knight-rider-cabs.firebaseapp.com",
  databaseURL: "https://knight-rider-cabs.firebaseio.com",
  projectId: "knight-rider-cabs",
  storageBucket: "knight-rider-cabs.appspot.com",
  messagingSenderId: "584765511924",
  appId: "1:584765511924:web:63a07ed91724165f99a6a1",
  measurementId: "G-TF44SL3HTR",
};


const db = admin.firestore();

const firebase = require("firebase");
firebase.initializeApp(firebaseConfig);



const FBAuth = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("No token found");
    return res.status(403).json({ error: "Unauthorized" });
  }

  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      //console.log(decodedToken);

      return db
        .collection("users")
        .where("userId", "==", req.user.uid)
        .where("role", "==", "admin")
        .limit(1)
        .get();
    })
    .then((data) => {
      req.user.admin = data.docs[0].data().handle;
      return next();
    })
    .catch((err) => {
      //console.error("Error while verifiying token");
      return res.status(403).json(err);
    });
};

app.get("/users", (req, res) => {
  db.collection("users")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let users = [];
      data.forEach((doc) => {
        users.push({
          userId: doc.id,
          name: doc.data().fullname,
          createdAt: doc.data().createdAt,
        });
      });
      return res.json(users);
    })
    .catch((err) => console.error(err));
});

app.post("/createuser", FBAuth, (req, res) => {
  const newUser = {
    bio: req.body.bio,
    handle: req.user.handle,
    createdAt: new Date().toISOString(),
  };
  db.collection("usersss")
    .add(newUser)
    .then((doc) => {
      res.json({ message: `User ${doc.id} created sucessfully` });
    })
    .catch((err) => {
      res.status(500).json({ error: "Something went wrong" });
      console.error(err);
    });
});

const isEmail = (email) => {
  const regEx = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  if (email.match(regEx)) return true;
  else return false;
};

const isEmpty = (string) => {
  if (string.trim() === "") return true;
  else return false;
};

//Signup Route (Add User Route)
app.post("/adduser", FBAuth, (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
    role: req.body.role,
    fullName: req.body.fullName,
    createdby: req.user.admin,
  };

  let errors = {};

  if (isEmpty(newUser.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(newUser.email)) {
    errors.email = "Must be a valid email address";
  }

  if (isEmpty(newUser.password)) {
    errors.password = "Must not be empty";
  }

  if (newUser.password !== newUser.confirmPassword) {
    errors.confirmPassword = "Passwords must match";
  }

  if (isEmpty(newUser.handle)) {
    errors.handle = "Must not be empty";
  }

  if (isEmpty(newUser.role)) {
    errors.role = "Must not be empty";
  }

  if (isEmpty(newUser.fullName)) {
    errors.fullName = "Must not be empty";
  }

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  //ToDo Validation
  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res
          .status(400)
          .json({ handle: "This username is already taken." });
      } else {
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
        createdby: newUser.createdby,
      };
      db.doc(`users/${newUser.handle}`).set(userCredentials);
      return res.status(201).json({ token, message: `User ${userId} created sucessfully`  });
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      res.status(500).json({ error: err.code });
      console.error(err);
    });
});

//Login
app.post("/login", (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  let errors = {};

  if (isEmpty(user.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(user.email)) {
    errors.email = "Must be a valid email address";
  }

  if (isEmpty(user.password)) {
    errors.password = "Must not be empty";
  }

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ general: "Wrong Credentials, Please try again." });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
});

exports.api = functions.region("us-central1").https.onRequest(app);
