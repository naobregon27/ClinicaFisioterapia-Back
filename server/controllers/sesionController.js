import SesionService from '../services/sesionService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * @desc    Registrar una nueva sesión
 * @route   POST /api/sesiones
 * @access  Private (empleado/admin)
 */
export const registrarSesion = asyncHandler(async (req, res) => {
  const resultado = await SesionService.registrarSesion(req.body, req.user._id);

  return ApiResponse.success(
    res,
    HTTP_STATUS.CREATED,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Obtener sesiones con filtros
 * @route   GET /api/sesiones
 * @access  Private (empleado/admin)
 */
export const obtenerSesiones = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, pacienteId, fecha, estado, pagado } = req.query;

  const opciones = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    sortBy,
    pacienteId,
    fecha,
    estado,
    pagado,
  };

  const resultado = await SesionService.obtenerSesiones({}, opciones);

  return ApiResponse.paginated(
    res,
    resultado.data.sesiones,
    resultado.data.pagination.page,
    resultado.data.pagination.limit,
    resultado.data.pagination.total,
    'Sesiones obtenidas exitosamente'
  );
});

/**
 * @desc    Obtener planilla diaria de movimientos
 * @route   GET /api/sesiones/planilla-diaria
 * @access  Private (empleado/admin)
 */
export const obtenerPlanillaDiaria = asyncHandler(async (req, res) => {
  const { fecha } = req.query;
  const fechaPlanilla = fecha ? new Date(fecha) : new Date();

  const resultado = await SesionService.obtenerPlanillaDiaria(fechaPlanilla);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Planilla diaria obtenida exitosamente',
    resultado.data
  );
});

/**
 * @desc    Obtener historial de sesiones de un paciente
 * @route   GET /api/sesiones/paciente/:pacienteId
 * @access  Private (empleado/admin)
 */
export const obtenerHistorialPaciente = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const opciones = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  };

  const resultado = await SesionService.obtenerHistorialPaciente(
    req.params.pacienteId,
    opciones
  );

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Historial obtenido exitosamente',
    resultado.data
  );
});

/**
 * @desc    Actualizar una sesión
 * @route   PUT /api/sesiones/:id
 * @access  Private (empleado/admin)
 */
export const actualizarSesion = asyncHandler(async (req, res) => {
  const resultado = await SesionService.actualizarSesion(
    req.params.id,
    req.body,
    req.user._id
  );

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Registrar pago de una sesión
 * @route   PUT /api/sesiones/:id/pago
 * @access  Private (empleado/admin)
 */
export const registrarPago = asyncHandler(async (req, res) => {
  const resultado = await SesionService.registrarPago(req.params.id, req.body);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Cancelar una sesión
 * @route   PUT /api/sesiones/:id/cancelar
 * @access  Private (empleado/admin)
 */
export const cancelarSesion = asyncHandler(async (req, res) => {
  const { motivo } = req.body;

  if (!motivo) {
    return ApiResponse.error(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Debe proporcionar un motivo de cancelación'
    );
  }

  const resultado = await SesionService.cancelarSesion(req.params.id, motivo);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Obtener estadísticas de sesiones
 * @route   GET /api/sesiones/estadisticas/resumen
 * @access  Private (empleado/admin)
 */
export const obtenerEstadisticas = asyncHandler(async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;

  let filtros = {};
  if (fechaInicio || fechaFin) {
    filtros.fecha = {};
    if (fechaInicio) filtros.fecha.$gte = new Date(fechaInicio);
    if (fechaFin) filtros.fecha.$lte = new Date(fechaFin);
  }

  const resultado = await SesionService.obtenerEstadisticas(filtros);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Estadísticas obtenidas exitosamente',
    resultado.data
  );
});

/**
 * @desc    Obtener sesiones pendientes de pago
 * @route   GET /api/sesiones/pagos-pendientes
 * @access  Private (empleado/admin)
 */
export const obtenerPagosPendientes = asyncHandler(async (req, res) => {
  const { limit, pacienteId } = req.query;

  const opciones = {
    limit: parseInt(limit) || 50,
    pacienteId,
  };

  const resultado = await SesionService.obtenerPagosPendientes(opciones);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Pagos pendientes obtenidos exitosamente',
    resultado.data
  );
});


