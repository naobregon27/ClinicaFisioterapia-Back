import { REGEX_PATTERNS } from '../conf/constants.js';

/**
 * Validadores de datos
 */
class Validators {
  /**
   * Valida un email
   * @param {String} email - Email a validar
   * @returns {Boolean}
   */
  static isValidEmail(email) {
    return REGEX_PATTERNS.EMAIL.test(email);
  }

  /**
   * Valida una contraseña
   * Debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial
   * @param {String} password - Contraseña a validar
   * @returns {Object} { isValid, message }
   */
  static isValidPassword(password) {
    if (!password || password.length < 8) {
      return {
        isValid: false,
        message: 'La contraseña debe tener al menos 8 caracteres',
      };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return {
        isValid: false,
        message: 'La contraseña debe contener al menos una letra minúscula',
      };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return {
        isValid: false,
        message: 'La contraseña debe contener al menos una letra mayúscula',
      };
    }

    if (!/(?=.*\d)/.test(password)) {
      return {
        isValid: false,
        message: 'La contraseña debe contener al menos un número',
      };
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return {
        isValid: false,
        message: 'La contraseña debe contener al menos un carácter especial (@$!%*?&)',
      };
    }

    return { isValid: true, message: 'Contraseña válida' };
  }

  /**
   * Valida un teléfono
   * @param {String} phone - Teléfono a validar
   * @returns {Boolean}
   */
  static isValidPhone(phone) {
    if (!phone) return true; // El teléfono es opcional
    return REGEX_PATTERNS.PHONE.test(phone);
  }

  /**
   * Sanitiza un string eliminando caracteres especiales
   * @param {String} str - String a sanitizar
   * @returns {String}
   */
  static sanitizeString(str) {
    if (!str) return '';
    return str.trim().replace(/[<>]/g, '');
  }

  /**
   * Valida campos requeridos
   * @param {Object} data - Objeto con los datos
   * @param {Array} requiredFields - Array con los campos requeridos
   * @returns {Object} { isValid, missingFields }
   */
  static validateRequiredFields(data, requiredFields) {
    const missingFields = [];

    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        missingFields.push(field);
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Valida que el nombre y apellido sean válidos
   * @param {String} name - Nombre o apellido
   * @returns {Object} { isValid, message }
   */
  static isValidName(name) {
    if (!name || name.trim().length < 2) {
      return {
        isValid: false,
        message: 'El nombre debe tener al menos 2 caracteres',
      };
    }

    if (name.length > 50) {
      return {
        isValid: false,
        message: 'El nombre no puede exceder 50 caracteres',
      };
    }

    // Solo letras, espacios y algunos caracteres especiales comunes en nombres
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/.test(name)) {
      return {
        isValid: false,
        message: 'El nombre solo puede contener letras',
      };
    }

    return { isValid: true, message: 'Nombre válido' };
  }
}

export default Validators;


