// Validate product payload before persisting data.
function validateProductInput(body) {
  const errors = {};

  if (!body.title || body.title.trim().length < 2) {
    errors.title = "Title must be at least 2 characters.";
  }

  if (typeof body.category !== "string" || body.category.trim().length === 0) {
    errors.category = "Category is required.";
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    errors.price = "Price must be a positive number.";
  }

  const stock = Number(body.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    errors.stock = "Stock must be an integer >= 0.";
  }

  return errors;
}

// Validate product update (all fields optional; validate only provided fields).
function validateProductUpdate(body) {
  const errors = {};

  if (body.title !== undefined && (!body.title || body.title.trim().length < 2)) {
    errors.title = "Title must be at least 2 characters.";
  }

  if (body.category !== undefined && (typeof body.category !== "string" || body.category.trim().length === 0)) {
    errors.category = "Category is required.";
  }

  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) {
      errors.price = "Price must be a positive number.";
    }
  }

  if (body.stock !== undefined) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      errors.stock = "Stock must be an integer >= 0.";
    }
  }

  if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
    errors.isActive = "isActive must be a boolean.";
  }

  return errors;
}

module.exports = { validateProductInput, validateProductUpdate };
