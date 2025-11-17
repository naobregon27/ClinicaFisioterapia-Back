import Validators from '../utils/validators.js';
import ApiResponse from '../utils/ApiResponse.js';
import mongoose from 'mongoose';

/**
 * Middleware para validar registro de sesión
 */
export const validateRegistrarSesion = (req, res, next) => {
  const { paciente, pago } = req.body;
  const errors = [];

  // Validar campos requeridos
  const { isValid, missingFields } = Validators.validateRequiredFields(req.body, [
    'paciente',
  ]);

  if (!isValid) {
    errors.push({
      field: 'required',
      message: `Los siguientes campos son obligatorios: ${missingFields.join(', ')}`,
    });
  }

  // Validar que paciente sea un ID válido de MongoDB
  if (paciente && !mongoose.Types.ObjectId.isValid(paciente)) {
    errors.push({ 
      field: 'paciente', 
      message: 'ID de paciente inválido' 
    });
  }

  // Validar horarios si se proporcionan
  if (req.body.horaEntrada && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(req.body.horaEntrada)) {
    errors.push({ 
      field: 'horaEntrada', 
      message: 'Formato de hora inválido (debe ser HH:MM)' 
    });
  }

  if (req.body.horaSalida && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(req.body.horaSalida)) {
    errors.push({ 
      field: 'horaSalida', 
      message: 'Formato de hora inválido (debe ser HH:MM)' 
    });
  }

  // Validar monto de pago
  if (pago && pago.monto !== undefined) {
    if (typeof pago.monto !== 'number' || pago.monto < 0) {
      errors.push({ 
        field: 'pago.monto', 
        message: 'El monto debe ser un número mayor o igual a 0' 
      });
    }
  }

  // Validar fecha si se proporciona
  if (req.body.fecha) {
    const fecha = new Date(req.body.fecha);
    if (isNaN(fecha.getTime())) {
      errors.push({ 
        field: 'fecha', 
        message: 'Fecha inválida' 
      });
    }
  }

  if (errors.length > 0) {
    return ApiResponse.validationError(res, errors);
  }

  next();
};

/**
 * Middleware para validar actualización de sesión
 */
export const validateActualizarSesion = (req, res, next) => {
  const errors = [];

  // Validar horarios si se proporcionan
  if (req.body.horaEntrada && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(req.body.horaEntrada)) {
    errors.push({ 
      field: 'horaEntrada', 
      message: 'Formato de hora inválido (debe ser HH:MM)' 
    });
  }

  if (req.body.horaSalida && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(req.body.horaSalida)) {
    errors.push({ 
      field: 'horaSalida', 
      message: 'Formato de hora inválido (debe ser HH:MM)' 
    });
  }

  // Validar monto de pago si se proporciona
  if (req.body.pago && req.body.pago.monto !== undefined) {
    if (typeof req.body.pago.monto !== 'number' || req.body.pago.monto < 0) {
      errors.push({ 
        field: 'pago.monto', 
        message: 'El monto debe ser un número mayor o igual a 0' 
      });
    }
  }

  if (errors.length > 0) {
    return ApiResponse.validationError(res, errors);
  }

  next();
};

/**
 * Middleware para validar registro de pago
 */
export const validateRegistrarPago = (req, res, next) => {
  const { monto, metodoPago } = req.body;
  const errors = [];

  // Validar campos requeridos
  const { isValid, missingFields } = Validators.validateRequiredFields(req.body, [
    'monto',
    'metodoPago',
  ]);

  if (!isValid) {
    errors.push({
      field: 'required',
      message: `Los siguientes campos son obligatorios: ${missingFields.join(', ')}`,
    });
  }

  // Validar monto
  if (monto !== undefined) {
    if (typeof monto !== 'number' || monto <= 0) {
      errors.push({ 
        field: 'monto', 
        message: 'El monto debe ser un número mayor a 0' 
      });
    }
  }

  // Validar método de pago
  const metodosValidos = ['efectivo', 'transferencia', 'tarjeta', 'obra_social'];
  if (metodoPago && !metodosValidos.includes(metodoPago)) {
    errors.push({ 
      field: 'metodoPago', 
      message: `El método de pago debe ser uno de: ${metodosValidos.join(', ')}` 
    });
  }

  if (errors.length > 0) {
    return ApiResponse.validationError(res, errors);
  }

  next();
};


