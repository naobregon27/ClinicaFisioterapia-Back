import Validators from '../utils/validators.js';
import ApiResponse from '../utils/ApiResponse.js';
import { ROLES } from '../conf/constants.js';

/**
 * Middleware para validar el registro de usuario
 */
export const validateRegister = (req, res, next) => {
  const { nombre, apellido, email, password, telefono, rol } = req.body;
  const errors = [];

  // Validar campos requeridos
  const { isValid, missingFields } = Validators.validateRequiredFields(req.body, [
    'nombre',
    'apellido',
    'email',
    'password',
  ]);

  if (!isValid) {
    errors.push({
      field: 'required',
      message: `Los siguientes campos son obligatorios: ${missingFields.join(', ')}`,
    });
  }

  // Validar nombre
  if (nombre) {
    const nombreValidation = Validators.isValidName(nombre);
    if (!nombreValidation.isValid) {
      errors.push({ field: 'nombre', message: nombreValidation.message });
    }
  }

  // Validar apellido
  if (apellido) {
    const apellidoValidation = Validators.isValidName(apellido);
    if (!apellidoValidation.isValid) {
      errors.push({ field: 'apellido', message: apellidoValidation.message });
    }
  }

  // Validar email
  if (email && !Validators.isValidEmail(email)) {
    errors.push({ field: 'email', message: 'El email no es válido' });
  }

  // Validar password
  if (password) {
    const passwordValidation = Validators.isValidPassword(password);
    if (!passwordValidation.isValid) {
      errors.push({ field: 'password', message: passwordValidation.message });
    }
  }

  // Validar teléfono (opcional)
  if (telefono && !Validators.isValidPhone(telefono)) {
    errors.push({
      field: 'telefono',
      message: 'El número de teléfono no es válido',
    });
  }

  // Validar rol (opcional)
  if (rol && !Object.values(ROLES).includes(rol)) {
    errors.push({
      field: 'rol',
      message: `El rol debe ser uno de: ${Object.values(ROLES).join(', ')}`,
    });
  }

  if (errors.length > 0) {
    console.log('❌ Errores de validación en registro:', JSON.stringify(errors, null, 2));
    console.log('📝 Datos recibidos:', JSON.stringify({ nombre, apellido, email, password: password ? '***' : undefined, telefono, rol }, null, 2));
    return ApiResponse.validationError(res, errors);
  }

  next();
};

/**
 * Middleware para validar el login
 */
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  // Validar campos requeridos
  if (!email) {
    errors.push({ field: 'email', message: 'El email es obligatorio' });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'La contraseña es obligatoria' });
  }

  // Validar formato de email
  if (email && !Validators.isValidEmail(email)) {
    errors.push({ field: 'email', message: 'El email no es válido' });
  }

  if (errors.length > 0) {
    return ApiResponse.validationError(res, errors);
  }

  next();
};

/**
 * Middleware para validar actualización de perfil
 */
export const validateProfileUpdate = (req, res, next) => {
  const { nombre, apellido, email, telefono } = req.body;
  const errors = [];

  // Validar nombre (si se proporciona)
  if (nombre) {
    const nombreValidation = Validators.isValidName(nombre);
    if (!nombreValidation.isValid) {
      errors.push({ field: 'nombre', message: nombreValidation.message });
    }
  }

  // Validar apellido (si se proporciona)
  if (apellido) {
    const apellidoValidation = Validators.isValidName(apellido);
    if (!apellidoValidation.isValid) {
      errors.push({ field: 'apellido', message: apellidoValidation.message });
    }
  }

  // Validar email (si se proporciona)
  if (email && !Validators.isValidEmail(email)) {
    errors.push({ field: 'email', message: 'El email no es válido' });
  }

  // Validar teléfono (si se proporciona)
  if (telefono && !Validators.isValidPhone(telefono)) {
    errors.push({
      field: 'telefono',
      message: 'El número de teléfono no es válido',
    });
  }

  if (errors.length > 0) {
    return ApiResponse.validationError(res, errors);
  }

  next();
};

/**
 * Middleware para validar cambio de contraseña
 */
export const validatePasswordChange = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const errors = [];

  // Validar campos requeridos
  if (!currentPassword) {
    errors.push({
      field: 'currentPassword',
      message: 'La contraseña actual es obligatoria',
    });
  }

  if (!newPassword) {
    errors.push({
      field: 'newPassword',
      message: 'La nueva contraseña es obligatoria',
    });
  }

  // Validar nueva contraseña
  if (newPassword) {
    const passwordValidation = Validators.isValidPassword(newPassword);
    if (!passwordValidation.isValid) {
      errors.push({ field: 'newPassword', message: passwordValidation.message });
    }
  }

  // Validar que las contraseñas no sean iguales
  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.push({
      field: 'newPassword',
      message: 'La nueva contraseña debe ser diferente a la actual',
    });
  }

  if (errors.length > 0) {
    return ApiResponse.validationError(res, errors);
  }

  next();
};

/**
 * Middleware para validar email
 */
export const validateEmail = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return ApiResponse.validationError(res, [
      { field: 'email', message: 'El email es obligatorio' },
    ]);
  }

  if (!Validators.isValidEmail(email)) {
    return ApiResponse.validationError(res, [
      { field: 'email', message: 'El email no es válido' },
    ]);
  }

  next();
};

/**
 * Middleware para validar verificación de email (email + código)
 */
export const validateVerifyEmail = (req, res, next) => {
  const { email, code } = req.body;
  const errors = [];

  // Validar email
  if (!email) {
    errors.push({ field: 'email', message: 'El email es obligatorio' });
  } else if (!Validators.isValidEmail(email)) {
    errors.push({ field: 'email', message: 'El email no es válido' });
  }

  // Validar código
  if (!code) {
    errors.push({ field: 'code', message: 'El código de verificación es obligatorio' });
  } else if (!/^\d{6}$/.test(code)) {
    errors.push({ field: 'code', message: 'El código de verificación debe ser de 6 dígitos numéricos' });
  }

  if (errors.length > 0) {
    return ApiResponse.validationError(res, errors);
  }

  next();
};


