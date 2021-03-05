const { admin, db } = require("../util/admin");

const { validateDriverAlcoholStatus } = require("../util/validators");

//Set user role as driver
exports.setProfile = (req, res) => {
  let rfid = req.user.rfid;
  db.doc(`/driverlog/${rfid}`)
    .update({
      login: true,
    })
    .then(() => {
      return res.json({ message: "Driver Logged successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.locationOnTrip = (req, res) => {
  if (req.body.location == null) {
    return res.status(400).json({ comment: "Geolocation must not be epmty" });
  }

  const locationRFID = {
    createdAt: new Date().toISOString(),
    location: req.body.location, //"location": [5° N, 5° E]
    //newLocation: new admin.firestore.GeoPoint(1, 2),
    handle: req.user.handle,
    rfid: req.user.rfid,
  };

  //**** Location Format
  // const locationInit = {
  //   lat: 0,
  //   long: 0,
  // };

  db.doc(`/driverlog/${req.user.rfid}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Driver Log not Found" });
      }
      return doc.ref.update({ location: locationRFID.location });
    })
    .then(() => {
      return db.collection("location").add(locationRFID);
    })
    .then(() => {
      res.json({ message: "Location added successfully" });
    })
    .catch((err) => {
      res.status(500).json({ error: err.code });
      console.error(err);
    });
};

//View driver locations
exports.getDriverLocation = (req, res) => {
  const user = {
    inputHandle: req.user.handle,
    inputRFID: req.params.rfid,
  };

  let driverLocations = {};

  db.doc(`/users/${user.inputHandle}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Driver not found " });
      }
      driverLocations.userId = doc.id;

      return db
        .collection("location")
        .orderBy("createdAt", "desc")
        .where("rfid", "==", user.inputRFID)
        .get();
    })
    .then((data) => {
      driverLocations.location = [];
      data.forEach((doc) => {
        driverLocations.location.push(doc.data());
      });
      return res.json(driverLocations);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//View driver alcohol status
exports.getDriverAlcoholStatus = (req, res) => {
  const requestInput = {
    handle: req.params.handle,
    month: req.params.month,
    year: req.params.year,
  };

  let driverData = {};

  db.collection("alcohol")
    .orderBy("createdAt", "desc")
    .where("handle", "==", req.params.handle)
    .where("month", "==", req.params.month)
    .where("year", "==", req.params.year)
    .get()
    .then((data) => {
      driverData.alcoholPerMonth = [];
      data.forEach((doc) => {
        driverData.alcoholPerMonth.push(doc.data());
      });
      return res.json(driverData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//Post a trip
exports.postATrip = (req, res) => {
  const newTrip = {
    handle: req.user.handle,
    customerId: req.body.customerId,
    startTime: "0",
    endTime: "0",
    tripCharge: 0,
    hasPassenger: false,
    status: "pending",
    drunken: false,
    alcoholID: ""
  };
  db.collection("trip")
    .add(newTrip)
    .then((doc) => {
      const resTrip = newTrip;
      resTrip.tripId = doc.id;
      res.json(resTrip);
    })
    .catch((err) => {
      res.status(500).json({ error: "Something went wrong" });
      console.error(err);
    });
};

//Start Tour
exports.startTour = (req, res) => {
  const info = {
    tripId: req.params.tripId,
    startTime: req.body.startTime,
    rfid: req.user.rfid,
    hasPassenger: true,
    status: "started",
  };

  db.doc(`/trip/${info.tripId}`)
    .update({
      startTime: info.startTime,
      hasPassenger: info.hasPassenger,
      tripId: info.tripId,
      status: info.status,
    })
    .then(() => {
      db.doc(`/driverlog/${info.rfid}`).update({
        tripId: info.tripId,
        hasPassenger: true,
      });
      return res.json({ message: "Tour Started successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.endtTour = (req, res) => {
  const info = {
    tripId: req.params.tripId,
    endTime: req.body.endTime,
    rfid: req.user.rfid,
    hasPassenger: false,
    status: "end",
    tripCharge: req.body.tripCharge,
  };

  db.doc(`/trip/${info.tripId}`)
    .update({
      endTime: info.endTime,
      hasPassenger: info.hasPassenger,
      tripCharge: info.tripCharge,
      status: info.status,
    })
    .then(() => {
      db.doc(`/driverlog/${info.rfid}`).update({
        tripId: "",
        hasPassenger: false,
      });
      return res.json({ message: "Tour Ended successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.getTripStatus = (req, res) => {
  let data = {};
  data.tripStatus = [];

  db.doc(`/trip/${req.params.tripId}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        data.tripStatus = doc.data();
        data.drunkenStatus = doc.data().drunken;
        return res.json(data);
      }
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.postDriverCommision = (req, res) => {
  const commission = {
    createdAt: new Date().toISOString(),
    handle: req.user.handle,
    tripId: req.params.tripId,
    month: new Date().toLocaleString("en-us", { month: "long" }),
    year: new Date().getFullYear(),
    receivedCommision: req.body.receivedCommision,
    commission: req.body.commission,
  };

  db.collection("drivercommission")
    .add(commission)
    .then(() => {
      const resCommission = commission;
      res.json(resCommission);
    })
    .catch((err) => {
      res.status(500).json({ error: "Something went wrong" });
      console.error(err);
    });
};

exports.viewDriverPerformance = (req, res) => {
  let month;
  let year;
  let performance = {};
  performance.user = [];
  performance.month = "";
  performance.year = "";
  performance.createdAt = "";
  db.collection("userlog")
    .get()
    .then((data) => {
      data.forEach((doc) => {
        performance.user.push({
          userId: doc.id,
          username: doc.id,
          createdAt: doc.data().createdAt,
          ranking: doc.data().ranking,
          year: doc.data().year,
          month: doc.data().month,
          handle: doc.data().handle,
          initialSalary: doc.data().initialSalary,
          salary: doc.data().salary,
          drunkenPesentage: doc.data().drunkenPesentage,
        });
        month = doc.data().month;
        year = doc.data().year;
        performance.month = doc.data().month;
        performance.year = doc.data().year;
        performance.createdAt = doc.data().createdAt;
      });
    })
    .then(() => {
      db.collection("alcohol")
        .orderBy("createdAt", "asc")
        .where("month", "==", month)
        .where("year", "==", year.toString())
        .get()
        .then((data) => {
          performance.alcoholStatusPrevious = [];
          data.forEach((doc) => {
            performance.alcoholStatusPrevious.push(doc.data());
          });
          return res.json(performance);
        });
    })
    .catch((err) => console.error(err));
};
