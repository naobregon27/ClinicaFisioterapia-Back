import EvolucionService from '../services/evolucionService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * @desc    Obtener datos de evolución de un paciente
 * @route   GET /api/evolucion/paciente/:pacienteId
 * @access  Private
 */
export const obtenerDatosEvolucion = asyncHandler(async (req, res) => {
  const { pacienteId } = req.params;
  const { fechaInicio, fechaFin } = req.query;

  const resultado = await EvolucionService.obtenerDatosEvolucion(pacienteId, {
    fechaInicio,
    fechaFin,
  });

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Datos de evolución obtenidos exitosamente',
    resultado.data
  );
});
