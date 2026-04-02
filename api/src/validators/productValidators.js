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

module.exports = { validateProductInput };
