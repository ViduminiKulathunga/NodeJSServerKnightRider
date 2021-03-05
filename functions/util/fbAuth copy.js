const { admin,db } = require("./admin");

exports.createUserAuth = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    //console.error("No token found");
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
        .where("role", "==", "admin")
        .limit(1)
        .get();
    })
    .then((data) => {
      req.user.admin = data.docs[0].data().handle;
      return next();
    })
    .catch((err) => {
     // console.error("Error while verifiying token");
      //console.log(err, " This is error");
      return res.status(403).json({error: "Acess not Defined."});
    });
};

exports.editUserAuth = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    //console.error("No token found");
    return res.status(403).json({ error: "Unauthorized" });
  }

      

      // //We call the asychronous function
      // getIsCapitalOrCountryIsItaly().then(result => {
      //   result.forEach(docSnapshot => {
      //     console.log(docSnapshot.data());
      //   });
      // });

  admin
      .auth()
      .verifyIdToken(idToken)
      .then((decodedToken) => {
        req.user = decodedToken;
        console.log(req.user.uid, 'User id');

        const usersRef = db.collection('users');

        async function getUserOrAdmin() {
          const isUser = usersRef.where('userId', '==', req.user.uid).limit(1).get();
          console.log( isUser, " isUser");
          const isAdmin = usersRef.where('role', '==', 'admin').get();
          console.log( isAdmin, "isAdmin");
  
          const [userQuerySnapshot, adminQuerySnapshot] = await Promise.all([
            isUser,
            isAdmin
          ]);
  
          const userSelection = userQuerySnapshot.docs;
          const adminSelection = adminQuerySnapshot.docs;
  
          const authUser = userSelection.concat(adminSelection);
  
          return authUser;
        }

        getUserOrAdmin().then(result => {
         
                console.log(result[0].data());
              
          //onsole.log(req.user.handle, " This is output");
          return next();
          });

    //     //console.log(decodedToken);
    //     return db
    //       .collection("users")
    //       .where("userId", "==", req.user.uid, "||", "role", "==", "admin" )
    //       .limit(1)
    //       .get();
    //   })
    // .then((data) => {
      // console.log(getUserOrAdmin(), " Get user")
      // req.user.handle = getUserOrAdmin[0].data().handle;
      // console.log(req.user.handle, " This is output");
      // return next();
    })
    .catch((err) => {
     // console.error("Error while verifiying token");
      console.log(err, " This is error");
      return res.status(403).json({error: "Acess not Defined."});
    });
}
