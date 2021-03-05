const isEmpty = (string) => {
  if (string.trim() === "") return true;
  else return false;
};

exports.validateGetDriverDetails = (data) => {
  

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};
