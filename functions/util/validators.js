const isEmail = (email) => {
  const regEx = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  if (email.match(regEx)) return true;
  else return false;
};

const isEmpty = (string) => {
  if (string.trim() === "") return true;
  else return false;
};

exports.validateAddRegisterUser = (data) => {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(data.email)) {
    errors.email = "Must be a valid email address";
  }

  if (isEmpty(data.password)) {
    errors.password = "Must not be empty";
  }

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords must match";
  }

  if (isEmpty(data.handle)) {
    errors.handle = "Must not be empty";
  }

  if (isEmpty(data.role)) {
    errors.role = "Must not be empty";
  }

  if (isEmpty(data.fullName)) {
    errors.fullName = "Must not be empty";
  }

  if (!isEmpty(data.role) && data.role === "driver") {
    if (isEmpty(data.rfid)) {
      errors.rfid = "Must not be empty";
    }

    if (isEmpty(data.licenseNo)) {
      errors.licenseNo = "Must not be empty";
    }
  }

  if (isEmpty(data.nic)) {
    errors.nic = "Must not be empty";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.validateLoginData = (data) => {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(data.email)) {
    errors.email = "Must be a valid email address";
  }

  if (isEmpty(data.password)) {
    errors.password = "Must not be empty";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.reduceUserDetails = (data) => {
  let userDetails = {};
  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  if (!isEmpty(data.phone.trim())) userDetails.phone = data.phone;
  if (!isEmpty(data.address.trim())) userDetails.address = data.address;

  return userDetails;
};

exports.validateDriverCommission = (data) => {
  let errors = {};

  if (isEmpty(data.inputHandle)) {
    errors.handle = "Please insert a driver username.";
  } 

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.validateDriverSalary = (data) => {
  let errors = {};

  if (isEmpty(data.month)) {
    errors.handle = "Please insert a Month";
  }
  
  if (isEmpty(data.year)) {
    errors.handle = "Please insert a Year";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
}

exports.validateDriverAlcoholStatus = (data) => {
  let errors = {};

  if (isEmpty(data.handle)) {
    errors.handle = "Please insert a driver username.";
  } 

  if (isEmpty(data.month)) {
    errors.month = "Please select a month.";
  } 

  if (isEmpty(data.year)) {
    errors.year = "Please select a year.";
  } 

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
}
