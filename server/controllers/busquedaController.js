import BusquedaService from '../services/busquedaService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * @desc    Búsqueda global rápida
 * @route   GET /api/buscar
 * @access  Private
 */
export const busquedaGlobal = asyncHandler(async (req, res) => {
  const { q, limit, tipos } = req.query;

  if (!q || q.trim().length < 2) {
    return ApiResponse.success(
      res,
      HTTP_STATUS.OK,
      'Ingrese al menos 2 caracteres para buscar',
      {
        pacientes: [],
        sesiones: [],
        usuarios: [],
        total: 0,
        termino: q || '',
      }
    );
  }

  const tiposArray = tipos ? tipos.split(',') : ['pacientes', 'sesiones', 'usuarios'];

  const resultado = await BusquedaService.busquedaGlobal(q, {
    limit: parseInt(limit) || 10,
    tipos: tiposArray,
  });

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Búsqueda realizada exitosamente',
    resultado.data
  );
});
