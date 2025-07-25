class Error extends global.Error {
  constructor(message, status, errors = null) {
    super(message);
    this.status = status;
    this.name = "Error";
    if (errors) {
      this.errors = errors; // Store detailed validation errors
    }
  }
}

module.exports = Error;
