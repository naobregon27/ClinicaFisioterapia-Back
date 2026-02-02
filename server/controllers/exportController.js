import ExportService from '../services/exportService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * @desc    Generar PDF de planilla diaria
 * @route   GET /api/exportar/planilla-diaria
 * @access  Private
 */
export const generarPDFPlanillaDiaria = asyncHandler(async (req, res) => {
  const { fecha } = req.query;

  if (!fecha) {
    return ApiResponse.error(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'La fecha es requerida (formato: YYYY-MM-DD)'
    );
  }

  const resultado = await ExportService.generarPDFPlanillaDiaria(fecha);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Generar PDF de ficha de paciente
 * @route   GET /api/exportar/ficha-paciente/:pacienteId
 * @access  Private
 */
export const generarPDFFichaPaciente = asyncHandler(async (req, res) => {
  const { pacienteId } = req.params;

  const resultado = await ExportService.generarPDFFichaPaciente(pacienteId);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message,
    resultado.data
  );
});
