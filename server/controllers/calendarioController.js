import CalendarioService from '../services/calendarioService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * @desc    Obtener sesiones por rango de fechas (para calendario)
 * @route   GET /api/calendario/sesiones
 * @access  Private
 */
export const obtenerSesionesPorRango = asyncHandler(async (req, res) => {
  const { fechaInicio, fechaFin, profesionalId, pacienteId, estado } = req.query;

  if (!fechaInicio || !fechaFin) {
    return ApiResponse.error(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'fechaInicio y fechaFin son requeridos'
    );
  }

  const resultado = await CalendarioService.obtenerSesionesPorRango(
    fechaInicio,
    fechaFin,
    { profesionalId, pacienteId, estado }
  );

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Sesiones obtenidas exitosamente',
    resultado.data
  );
});

/**
 * @desc    Obtener sesiones agrupadas por día
 * @route   GET /api/calendario/sesiones-agrupadas
 * @access  Private
 */
export const obtenerSesionesAgrupadas = asyncHandler(async (req, res) => {
  const { fechaInicio, fechaFin, profesionalId, pacienteId, estado } = req.query;

  if (!fechaInicio || !fechaFin) {
    return ApiResponse.error(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'fechaInicio y fechaFin son requeridos'
    );
  }

  const resultado = await CalendarioService.obtenerSesionesAgrupadasPorDia(
    fechaInicio,
    fechaFin,
    { profesionalId, pacienteId, estado }
  );

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Sesiones agrupadas obtenidas exitosamente',
    resultado.data
  );
});
