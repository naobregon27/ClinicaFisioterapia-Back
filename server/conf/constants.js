/**
 * Constantes de la aplicación
 */

export const ROLES = {
  ADMIN: 'administrador',
  EMPLEADO: 'empleado',
  USUARIO: 'usuario',
};

export const USER_STATUS = {
  ACTIVE: 'activo',
  INACTIVE: 'inactivo',
  SUSPENDED: 'suspendido',
  PENDING_VERIFICATION: 'pendiente_verificacion',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export const ERROR_MESSAGES = {
  // Autenticación
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  EMAIL_ALREADY_EXISTS: 'El email ya está registrado',
  USER_NOT_FOUND: 'Usuario no encontrado',
  UNAUTHORIZED: 'No autorizado',
  TOKEN_INVALID: 'Token inválido o expirado',
  TOKEN_REQUIRED: 'Se requiere un token de autenticación',
  INSUFFICIENT_PERMISSIONS: 'No tienes permisos suficientes',
  
  // Verificación
  EMAIL_NOT_VERIFIED: 'Email no verificado. Por favor verifica tu correo electrónico',
  VERIFICATION_TOKEN_INVALID: 'Token de verificación inválido o expirado',
  EMAIL_ALREADY_VERIFIED: 'El email ya ha sido verificado',
  
  // Generales
  INTERNAL_ERROR: 'Error interno del servidor',
  VALIDATION_ERROR: 'Error de validación',
  RESOURCE_NOT_FOUND: 'Recurso no encontrado',
  
  // Base de datos
  DATABASE_ERROR: 'Error en la base de datos',
  DUPLICATE_KEY: 'Ya existe un registro con esos datos',
};

export const SUCCESS_MESSAGES = {
  USER_REGISTERED: 'Usuario registrado exitosamente. Por favor verifica tu email',
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGOUT_SUCCESS: 'Sesión cerrada exitosamente',
  EMAIL_VERIFIED: 'Email verificado exitosamente',
  PASSWORD_UPDATED: 'Contraseña actualizada exitosamente',
  PROFILE_UPDATED: 'Perfil actualizado exitosamente',
  EMAIL_SENT: 'Email enviado exitosamente',
};

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
};

export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
};


