import { HTTP_STATUS } from '../conf/constants.js';

/**
 * Clase para estandarizar las respuestas de la API
 */
class ApiResponse {
  /**
   * Respuesta exitosa
   * @param {Object} res - Objeto de respuesta de Express
   * @param {Number} statusCode - Código de estado HTTP
   * @param {String} message - Mensaje de respuesta
   * @param {Object} data - Datos a enviar
   */
  static success(res, statusCode = HTTP_STATUS.OK, message = 'Operación exitosa', data = null) {
    const response = {
      success: true,
      message,
      ...(data && { data }),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta de error
   * @param {Object} res - Objeto de respuesta de Express
   * @param {Number} statusCode - Código de estado HTTP
   * @param {String} message - Mensaje de error
   * @param {Object} errors - Detalles del error
   */
  static error(res, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, message = 'Error en la operación', errors = null) {
    const response = {
      success: false,
      message,
      ...(errors && { errors }),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta de validación fallida
   * @param {Object} res - Objeto de respuesta de Express
   * @param {Array|Object} errors - Errores de validación
   */
  static validationError(res, errors) {
    return ApiResponse.error(
      res,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      'Error de validación',
      errors
    );
  }

  /**
   * Respuesta de no autorizado
   * @param {Object} res - Objeto de respuesta de Express
   * @param {String} message - Mensaje de error
   */
  static unauthorized(res, message = 'No autorizado') {
    return ApiResponse.error(res, HTTP_STATUS.UNAUTHORIZED, message);
  }

  /**
   * Respuesta de prohibido
   * @param {Object} res - Objeto de respuesta de Express
   * @param {String} message - Mensaje de error
   */
  static forbidden(res, message = 'Acceso prohibido') {
    return ApiResponse.error(res, HTTP_STATUS.FORBIDDEN, message);
  }

  /**
   * Respuesta de no encontrado
   * @param {Object} res - Objeto de respuesta de Express
   * @param {String} message - Mensaje de error
   */
  static notFound(res, message = 'Recurso no encontrado') {
    return ApiResponse.error(res, HTTP_STATUS.NOT_FOUND, message);
  }

  /**
   * Respuesta de conflicto
   * @param {Object} res - Objeto de respuesta de Express
   * @param {String} message - Mensaje de error
   */
  static conflict(res, message = 'Conflicto con el estado actual') {
    return ApiResponse.error(res, HTTP_STATUS.CONFLICT, message);
  }

  /**
   * Respuesta con paginación
   * @param {Object} res - Objeto de respuesta de Express
   * @param {Array} data - Datos a enviar
   * @param {Number} page - Página actual
   * @param {Number} limit - Límite de resultados por página
   * @param {Number} total - Total de documentos
   * @param {String} message - Mensaje de respuesta
   */
  static paginated(res, data, page, limit, total, message = 'Datos obtenidos exitosamente') {
    const totalPages = Math.ceil(total / limit);
    
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  }
}

export default ApiResponse;


