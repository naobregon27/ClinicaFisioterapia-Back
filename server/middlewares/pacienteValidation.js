import Validators from '../utils/validators.js';
import ApiResponse from '../utils/ApiResponse.js';

/**
 * Middleware para validar creación de paciente
 */
export const validateCrearPaciente = (req, res, next) => {
  const { nombre, apellido, dni, telefono } = req.body;
  const errors = [];

  // Validar campos requeridos
  const { isValid, missingFields } = Validators.validateRequiredFields(req.body, [
    'nombre',
    'apellido',
    'dni',
    'telefono',
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

  // Validar DNI
  if (dni && !/^\d{7,8}$/.test(dni)) {
    errors.push({ 
      field: 'dni', 
      message: 'El DNI debe contener 7 u 8 dígitos numéricos' 
    });
  }

  // Validar teléfono
  if (telefono && telefono.trim().length < 7) {
    errors.push({ 
      field: 'telefono', 
      message: 'El teléfono debe tener al menos 7 caracteres' 
    });
  }

  // Validar email si se proporciona
  if (req.body.email && !Validators.isValidEmail(req.body.email)) {
    errors.push({ field: 'email', message: 'El email no es válido' });
  }

  // Validar obra social si se proporciona
  if (req.body.obraSocial && !req.body.obraSocial.nombre) {
    errors.push({ 
      field: 'obraSocial', 
      message: 'Debe especificar el nombre de la obra social' 
    });
  }

  if (errors.length > 0) {
    return ApiResponse.validationError(res, errors);
  }

  next();
};

/**
 * Middleware para validar actualización de paciente
 */
export const validateActualizarPaciente = (req, res, next) => {
  const { nombre, apellido, dni, email } = req.body;
  const errors = [];

  // Validar nombre si se proporciona
  if (nombre) {
    const nombreValidation = Validators.isValidName(nombre);
    if (!nombreValidation.isValid) {
      errors.push({ field: 'nombre', message: nombreValidation.message });
    }
  }

  // Validar apellido si se proporciona
  if (apellido) {
    const apellidoValidation = Validators.isValidName(apellido);
    if (!apellidoValidation.isValid) {
      errors.push({ field: 'apellido', message: apellidoValidation.message });
    }
  }

  // Validar DNI si se proporciona
  if (dni && !/^\d{7,8}$/.test(dni)) {
    errors.push({ 
      field: 'dni', 
      message: 'El DNI debe contener 7 u 8 dígitos numéricos' 
    });
  }

  // Validar email si se proporciona
  if (email && !Validators.isValidEmail(email)) {
    errors.push({ field: 'email', message: 'El email no es válido' });
  }

  if (errors.length > 0) {
    return ApiResponse.validationError(res, errors);
  }

  next();
};


