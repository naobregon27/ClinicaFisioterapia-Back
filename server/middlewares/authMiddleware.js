import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import ApiResponse from '../utils/ApiResponse.js';
import { ERROR_MESSAGES, HTTP_STATUS, ROLES, USER_STATUS } from '../conf/constants.js';

/**
 * Middleware para proteger rutas - Verifica que el usuario esté autenticado
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Verificar si el token está en las cookies o en los headers
  if (req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Verificar si existe el token
  if (!token) {
    return ApiResponse.unauthorized(res, ERROR_MESSAGES.TOKEN_REQUIRED);
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Obtener usuario del token
    const user = await User.findById(decoded.id);

    if (!user) {
      return ApiResponse.unauthorized(res, ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Verificar que el usuario esté activo
    if (user.estado === USER_STATUS.INACTIVE || user.estado === USER_STATUS.SUSPENDED) {
      return ApiResponse.forbidden(res, 'Tu cuenta está inactiva o suspendida');
    }

    // Verificar que el email esté verificado
    if (!user.emailVerificado) {
      return ApiResponse.forbidden(res, ERROR_MESSAGES.EMAIL_NOT_VERIFIED);
    }

    // Verificar si la cuenta está bloqueada
    if (user.metadata.bloqueadoHasta && user.metadata.bloqueadoHasta > Date.now()) {
      return ApiResponse.forbidden(
        res,
        `Tu cuenta está bloqueada temporalmente. Intenta nuevamente más tarde.`
      );
    }

    // Agregar usuario a la request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'El token ha expirado');
    }
    return ApiResponse.unauthorized(res, ERROR_MESSAGES.TOKEN_INVALID);
  }
});

/**
 * Middleware para autorizar roles específicos
 * @param  {...String} roles - Roles permitidos
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
    }

    if (!roles.includes(req.user.rol)) {
      return ApiResponse.forbidden(
        res,
        `El rol '${req.user.rol}' no tiene permisos para acceder a este recurso`
      );
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario sea el propietario del recurso o administrador
 */
export const isOwnerOrAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return ApiResponse.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
  }

  const resourceUserId = req.params.userId || req.params.id;

  // Si es administrador, permitir acceso
  if (req.user.rol === ROLES.ADMIN) {
    return next();
  }

  // Si es el propietario del recurso, permitir acceso
  if (req.user._id.toString() === resourceUserId) {
    return next();
  }

  return ApiResponse.forbidden(
    res,
    'No tienes permisos para acceder a este recurso'
  );
});

/**
 * Middleware opcional de autenticación - No falla si no hay token
 * Útil para rutas que pueden funcionar con o sin autenticación
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (user && user.emailVerificado) {
        req.user = user;
      }
    } catch (error) {
      // No hacer nada, simplemente continuar sin usuario
    }
  }

  next();
});

/**
 * Middleware para verificar que el email esté verificado
 */
export const requireEmailVerified = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return ApiResponse.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
  }

  if (!req.user.emailVerificado) {
    return ApiResponse.forbidden(res, ERROR_MESSAGES.EMAIL_NOT_VERIFIED);
  }

  next();
});


