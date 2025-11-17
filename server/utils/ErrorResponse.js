/**
 * Clase personalizada de error para manejar errores de la aplicación
 */
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Capturar el stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ErrorResponse;


