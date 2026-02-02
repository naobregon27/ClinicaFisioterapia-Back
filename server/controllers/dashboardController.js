import DashboardService from '../services/dashboardService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * @desc    Obtener métricas del dashboard
 * @route   GET /api/dashboard/metricas
 * @access  Private
 */
export const obtenerMetricas = asyncHandler(async (req, res) => {
  const { fecha } = req.query;

  const resultado = await DashboardService.obtenerMetricasDashboard(
    req.user._id,
    { fecha }
  );

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Métricas obtenidas exitosamente',
    resultado.data
  );
});
