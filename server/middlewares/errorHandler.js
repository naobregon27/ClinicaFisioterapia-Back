import { HTTP_STATUS, ERROR_MESSAGES } from '../conf/constants.js';
import colors from 'colors';

/**
 * Middleware para manejar errores de la aplicación
 * @param {Error} err - Error capturado
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log del error en consola (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.error(colors.red.bold('Error capturado:'));
    console.error(colors.red(err.stack));
  }

  // Error de Mongoose - CastError (ID inválido)
  if (err.name === 'CastError') {
    error.message = 'Recurso no encontrado con el ID proporcionado';
    error.statusCode = HTTP_STATUS.NOT_FOUND;
  }

  // Error de Mongoose - Validación
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    error.message = messages.join(', ');
    error.statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
  }

  // Error de Mongoose - Duplicate Key (código 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error.message = `El ${field} '${value}' ya está registrado`;
    error.statusCode = HTTP_STATUS.CONFLICT;
  }

  // Error de JWT - Token inválido
  if (err.name === 'JsonWebTokenError') {
    error.message = ERROR_MESSAGES.TOKEN_INVALID;
    error.statusCode = HTTP_STATUS.UNAUTHORIZED;
  }

  // Error de JWT - Token expirado
  if (err.name === 'TokenExpiredError') {
    error.message = 'El token ha expirado';
    error.statusCode = HTTP_STATUS.UNAUTHORIZED;
  }

  // Error de Multer - Archivo muy grande
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = 'El archivo es demasiado grande';
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
  }

  // Error de Multer - Tipo de archivo inválido
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error.message = 'Tipo de archivo no permitido';
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
  }

  // Respuesta de error
  res.status(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: error.message || ERROR_MESSAGES.INTERNAL_ERROR,
    ...(process.env.NODE_ENV === 'development' && {
      error: err,
      stack: err.stack,
    }),
  });
};

/**
 * Middleware para manejar rutas no encontradas
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next middleware
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  error.statusCode = HTTP_STATUS.NOT_FOUND;
  next(error);
};

export default errorHandler;


