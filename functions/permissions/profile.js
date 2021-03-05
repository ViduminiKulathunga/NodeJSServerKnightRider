const { ROLE } = require("../util/data");

function canUploadImage(user, profile) {
  return user.role === ROLE.ADMIN || user.userId === profile.userId;
}

function canEditDetails(user, profile) {
  return (
    user.role === ROLE.ADMIN ||
    user.role === ROLE.STAFF ||
    user.userId === profile.userId
  );
}

function canViewProfile(user) {
  return user.role === ROLE.ADMIN || user.role === ROLE.STAFF;
}

module.exports = {
  canUploadImage,
  canEditDetails,
  canViewProfile,
};
