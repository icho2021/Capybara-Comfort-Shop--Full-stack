// Validate registration payload on the server.
function validateRegisterInput(body) {
  const errors = {};

  if (!body.name || body.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!body.email || !emailRegex.test(body.email)) {
    errors.email = "Please enter a valid email.";
  }

  const password = body.password || "";
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  if (!(password.length >= 8 && hasUpper && hasLower && hasNumber)) {
    errors.password =
      "Password must be 8+ chars and include upper, lower, number.";
  }

  return errors;
}

module.exports = { validateRegisterInput };
