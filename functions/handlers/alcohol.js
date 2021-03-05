const { db } = require("../util/admin");

exports.postAlcohol = (req, res) => {
  const userId = req.params.id;
  let active = req.body.active;
  let drunken = req.body.drunken;

  let isActiveTrueSet = (active === 'true' ? true : false);
  let isDrunkenTrueSet = (drunken === 'true' ? true : false);

  const data = {
    active: isActiveTrueSet,
    drunken: isDrunkenTrueSet,
  };

  db.doc(`/driverlog/${req.params.id}`)
    .update(data)
    .then(() => {
      return res.json({ message: "Details added sucessfully" });
    })
    .catch((err) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
};
