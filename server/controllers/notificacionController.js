import NotificacionService from '../services/notificacionService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * @desc    Obtener notificaciones del usuario actual
 * @route   GET /api/notificaciones
 * @access  Private
 */
export const obtenerNotificaciones = asyncHandler(async (req, res) => {
  const { page, limit, leida, tipo, prioridad } = req.query;

  const opciones = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    leida,
    tipo,
    prioridad,
  };

  const resultado = await NotificacionService.obtenerNotificaciones(
    req.user._id,
    opciones
  );

  return ApiResponse.paginated(
    res,
    resultado.data.notificaciones,
    resultado.data.pagination.page,
    resultado.data.pagination.limit,
    resultado.data.pagination.total,
    'Notificaciones obtenidas exitosamente'
  );
});

/**
 * @desc    Obtener notificaciones no leídas del usuario actual
 * @route   GET /api/notificaciones/no-leidas
 * @access  Private
 */
export const obtenerNotificacionesNoLeidas = asyncHandler(async (req, res) => {
  const resultado = await NotificacionService.obtenerNotificacionesNoLeidas(
    req.user._id
  );

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Notificaciones no leídas obtenidas exitosamente',
    resultado.data
  );
});

/**
 * @desc    Marcar notificación como leída
 * @route   PUT /api/notificaciones/:id/leer
 * @access  Private
 */
export const marcarComoLeida = asyncHandler(async (req, res) => {
  const resultado = await NotificacionService.marcarComoLeida(
    req.params.id,
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
 * @desc    Marcar todas las notificaciones como leídas
 * @route   PUT /api/notificaciones/leer-todas
 * @access  Private
 */
export const marcarTodasComoLeidas = asyncHandler(async (req, res) => {
  const resultado = await NotificacionService.marcarTodasComoLeidas(
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
 * @desc    Eliminar notificación
 * @route   DELETE /api/notificaciones/:id
 * @access  Private
 */
export const eliminarNotificacion = asyncHandler(async (req, res) => {
  const resultado = await NotificacionService.eliminarNotificacion(
    req.params.id,
    req.user._id
  );

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message
  );
});
