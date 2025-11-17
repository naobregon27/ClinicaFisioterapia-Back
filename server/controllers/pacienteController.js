import PacienteService from '../services/pacienteService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * @desc    Crear un nuevo paciente
 * @route   POST /api/pacientes
 * @access  Private (empleado/admin)
 */
export const crearPaciente = asyncHandler(async (req, res) => {
  const resultado = await PacienteService.crearPaciente(req.body, req.user._id);

  return ApiResponse.success(
    res,
    HTTP_STATUS.CREATED,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Obtener todos los pacientes
 * @route   GET /api/pacientes
 * @access  Private (empleado/admin)
 */
export const obtenerPacientes = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, estado, obraSocial, busqueda } = req.query;

  const opciones = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    sortBy,
    estado,
    obraSocial,
    busqueda,
  };

  const resultado = await PacienteService.obtenerPacientes({}, opciones);

  return ApiResponse.paginated(
    res,
    resultado.data.pacientes,
    resultado.data.pagination.page,
    resultado.data.pagination.limit,
    resultado.data.pagination.total,
    'Pacientes obtenidos exitosamente'
  );
});

/**
 * @desc    Buscar pacientes (búsqueda rápida)
 * @route   GET /api/pacientes/buscar
 * @access  Private (empleado/admin)
 */
export const buscarPacientes = asyncHandler(async (req, res) => {
  const { q, limit } = req.query;

  if (!q || q.trim() === '') {
    return ApiResponse.error(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Debe proporcionar un término de búsqueda'
    );
  }

  const resultado = await PacienteService.buscarPacientes(q, parseInt(limit) || 10);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Búsqueda realizada exitosamente',
    resultado.data
  );
});

/**
 * @desc    Obtener un paciente por ID
 * @route   GET /api/pacientes/:id
 * @access  Private (empleado/admin)
 */
export const obtenerPacientePorId = asyncHandler(async (req, res) => {
  const resultado = await PacienteService.obtenerPacientePorId(req.params.id);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Paciente obtenido exitosamente',
    resultado.data
  );
});

/**
 * @desc    Actualizar un paciente
 * @route   PUT /api/pacientes/:id
 * @access  Private (empleado/admin)
 */
export const actualizarPaciente = asyncHandler(async (req, res) => {
  const resultado = await PacienteService.actualizarPaciente(
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
 * @desc    Eliminar un paciente (soft delete)
 * @route   DELETE /api/pacientes/:id
 * @access  Private (admin)
 */
export const eliminarPaciente = asyncHandler(async (req, res) => {
  const resultado = await PacienteService.eliminarPaciente(req.params.id);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message
  );
});

/**
 * @desc    Dar de alta médica a un paciente
 * @route   PUT /api/pacientes/:id/alta
 * @access  Private (empleado/admin)
 */
export const darAltaMedica = asyncHandler(async (req, res) => {
  const resultado = await PacienteService.darAltaMedica(req.params.id, req.body);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Obtener estadísticas de pacientes
 * @route   GET /api/pacientes/estadisticas/resumen
 * @access  Private (empleado/admin)
 */
export const obtenerEstadisticas = asyncHandler(async (req, res) => {
  const resultado = await PacienteService.obtenerEstadisticas();

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Estadísticas obtenidas exitosamente',
    resultado.data
  );
});


