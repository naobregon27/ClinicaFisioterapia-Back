import AdminService from '../services/adminService.js';
import AuditoriaService from '../services/auditoriaService.js';
import PagoPersonalService from '../services/pagoPersonalService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS, ROLES } from '../conf/constants.js';
import { registrarAccionManual } from '../middlewares/auditMiddleware.js';

// ============================================
// GESTIÓN DE USUARIOS
// ============================================

/**
 * @desc    Obtener todos los usuarios del sistema
 * @route   GET /api/admin/usuarios
 * @access  Private (Solo Administrador)
 */
export const obtenerUsuarios = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, rol, estado, emailVerificado, busqueda } =
    req.query;

  const opciones = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    sortBy,
    rol,
    estado,
    emailVerificado,
    busqueda,
  };

  const resultado = await AdminService.obtenerUsuarios({}, opciones);

  return ApiResponse.paginated(
    res,
    resultado.data.usuarios,
    resultado.data.pagination.page,
    resultado.data.pagination.limit,
    resultado.data.pagination.total,
    'Usuarios obtenidos exitosamente'
  );
});

/**
 * @desc    Obtener usuarios que no son administradores (empleados y usuarios)
 * @route   GET /api/admin/usuarios/colaboradores
 * @access  Private (Solo Administrador)
 */
export const obtenerUsuariosColaboradores = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, estado, emailVerificado, busqueda } = req.query;

  const opciones = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    sortBy,
    estado,
    emailVerificado,
    busqueda,
  };

  const filtros = {
    rol: { $in: [ROLES.EMPLEADO, ROLES.USUARIO] },
  };

  const resultado = await AdminService.obtenerUsuarios(filtros, opciones);

  return ApiResponse.paginated(
    res,
    resultado.data.usuarios,
    resultado.data.pagination.page,
    resultado.data.pagination.limit,
    resultado.data.pagination.total,
    'Empleados y usuarios obtenidos exitosamente'
  );
});

/**
 * @desc    Obtener un usuario por ID con toda su información
 * @route   GET /api/admin/usuarios/:id
 * @access  Private (Solo Administrador)
 */
export const obtenerUsuarioPorId = asyncHandler(async (req, res) => {
  const resultado = await AdminService.obtenerUsuarioPorId(req.params.id);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Usuario obtenido exitosamente',
    resultado.data
  );
});

/**
 * @desc    Crear un nuevo usuario
 * @route   POST /api/admin/usuarios
 * @access  Private (Solo Administrador)
 */
export const crearUsuario = asyncHandler(async (req, res) => {
  const resultado = await AdminService.crearUsuario(req.body);

  // Registrar acción de auditoría
  if (resultado.data?.usuario) {
    await registrarAccionManual(
      req,
      'crear',
      `Usuario creado: ${resultado.data.usuario.email}`,
      { tipo: 'usuario', id: resultado.data.usuario.id, nombre: resultado.data.usuario.email },
      null,
      resultado.data.usuario
    );
  }

  return ApiResponse.success(
    res,
    HTTP_STATUS.CREATED,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Actualizar información de un usuario
 * @route   PUT /api/admin/usuarios/:id
 * @access  Private (Solo Administrador)
 */
export const actualizarUsuario = asyncHandler(async (req, res) => {
  const resultado = await AdminService.actualizarUsuario(
    req.params.id,
    req.body
  );

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Cambiar contraseña de un usuario
 * @route   PUT /api/admin/usuarios/:id/password
 * @access  Private (Solo Administrador)
 */
export const cambiarPasswordUsuario = asyncHandler(async (req, res) => {
  const { nuevaPassword } = req.body;

  if (!nuevaPassword) {
    return ApiResponse.error(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Debe proporcionar la nueva contraseña'
    );
  }

  const resultado = await AdminService.cambiarPasswordUsuario(
    req.params.id,
    nuevaPassword
  );

  return ApiResponse.success(res, HTTP_STATUS.OK, resultado.message);
});

/**
 * @desc    Cambiar rol de un usuario
 * @route   PUT /api/admin/usuarios/:id/rol
 * @access  Private (Solo Administrador)
 */
export const cambiarRolUsuario = asyncHandler(async (req, res) => {
  const { nuevoRol } = req.body;

  if (!nuevoRol) {
    return ApiResponse.error(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Debe proporcionar el nuevo rol'
    );
  }

  // Obtener usuario antes del cambio para auditoría
  const User = (await import('../models/User.js')).default;
  const usuarioAntes = await User.findById(req.params.id).lean();

  const resultado = await AdminService.cambiarRolUsuario(
    req.params.id,
    nuevoRol
  );

  // Registrar acción de auditoría
  await registrarAccionManual(
    req,
    'cambiar_rol',
    `Rol cambiado de '${resultado.data.rolAnterior}' a '${resultado.data.nuevoRol}' para usuario ${usuarioAntes?.email || req.params.id}`,
    { tipo: 'usuario', id: req.params.id, nombre: usuarioAntes?.email },
    { rol: resultado.data.rolAnterior },
    { rol: resultado.data.nuevoRol }
  );

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Cambiar estado de un usuario
 * @route   PUT /api/admin/usuarios/:id/estado
 * @access  Private (Solo Administrador)
 */
export const cambiarEstadoUsuario = asyncHandler(async (req, res) => {
  const { nuevoEstado } = req.body;

  if (!nuevoEstado) {
    return ApiResponse.error(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Debe proporcionar el nuevo estado'
    );
  }

  const resultado = await AdminService.cambiarEstadoUsuario(
    req.params.id,
    nuevoEstado
  );

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Desbloquear cuenta de usuario
 * @route   PUT /api/admin/usuarios/:id/desbloquear
 * @access  Private (Solo Administrador)
 */
export const desbloquearUsuario = asyncHandler(async (req, res) => {
  const resultado = await AdminService.desbloquearUsuario(req.params.id);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Eliminar/Desactivar usuario
 * @route   DELETE /api/admin/usuarios/:id
 * @access  Private (Solo Administrador)
 */
export const eliminarUsuario = asyncHandler(async (req, res) => {
  const resultado = await AdminService.eliminarUsuario(req.params.id);

  return ApiResponse.success(res, HTTP_STATUS.OK, resultado.message);
});

// ============================================
// AUDITORÍA
// ============================================

/**
 * @desc    Obtener todas las acciones de auditoría
 * @route   GET /api/admin/auditoria
 * @access  Private (Solo Administrador)
 */
export const obtenerAuditoria = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    sortBy,
    usuarioId,
    accion,
    recursoTipo,
    recursoId,
    fechaInicio,
    fechaFin,
    estado,
  } = req.query;

  const opciones = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    sortBy,
    usuarioId,
    accion,
    recursoTipo,
    recursoId,
    fechaInicio,
    fechaFin,
    estado,
  };

  const resultado = await AuditoriaService.obtenerAuditoria({}, opciones);

  return ApiResponse.paginated(
    res,
    resultado.data.registros,
    resultado.data.pagination.page,
    resultado.data.pagination.limit,
    resultado.data.pagination.total,
    'Registros de auditoría obtenidos exitosamente'
  );
});

/**
 * @desc    Obtener acciones de un usuario específico
 * @route   GET /api/admin/auditoria/usuario/:usuarioId
 * @access  Private (Solo Administrador)
 */
export const obtenerAccionesUsuario = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const opciones = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
  };

  const resultado = await AuditoriaService.obtenerAccionesUsuario(
    req.params.usuarioId,
    opciones
  );

  return ApiResponse.paginated(
    res,
    resultado.data.registros,
    resultado.data.pagination.page,
    resultado.data.pagination.limit,
    resultado.data.pagination.total,
    'Acciones del usuario obtenidas exitosamente'
  );
});

/**
 * @desc    Obtener estadísticas de auditoría
 * @route   GET /api/admin/auditoria/estadisticas
 * @access  Private (Solo Administrador)
 */
export const obtenerEstadisticasAuditoria = asyncHandler(async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;

  const filtros = {};
  if (fechaInicio || fechaFin) {
    filtros.createdAt = {};
    if (fechaInicio) filtros.createdAt.$gte = new Date(fechaInicio);
    if (fechaFin) filtros.createdAt.$lte = new Date(fechaFin);
  }

  const resultado = await AuditoriaService.obtenerEstadisticas(filtros);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Estadísticas de auditoría obtenidas exitosamente',
    resultado.data
  );
});

// ============================================
// PLANILLA DE PAGOS DEL PERSONAL
// ============================================

/**
 * @desc    Crear o actualizar un registro de pago diario
 * @route   POST /api/admin/pagos-personal
 * @access  Private (Solo Administrador)
 */
export const crearOActualizarPago = asyncHandler(async (req, res) => {
  const resultado = await PagoPersonalService.crearOActualizarPago(
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
 * @desc    Crear múltiples registros de pago (importar planilla)
 * @route   POST /api/admin/pagos-personal/multiples
 * @access  Private (Solo Administrador)
 */
export const crearMultiplesPagos = asyncHandler(async (req, res) => {
  const { registros } = req.body;

  if (!registros || !Array.isArray(registros) || registros.length === 0) {
    return ApiResponse.error(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Debe proporcionar un array de registros'
    );
  }

  const resultado = await PagoPersonalService.crearMultiplesPagos(
    registros,
    req.user._id
  );

  return ApiResponse.success(
    res,
    HTTP_STATUS.CREATED,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Obtener planilla completa de un mes
 * @route   GET /api/admin/pagos-personal/planilla
 * @access  Private (Solo Administrador)
 */
export const obtenerPlanillaMes = asyncHandler(async (req, res) => {
  const resultado = await PagoPersonalService.obtenerPlanillaCompleta();

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Planilla obtenida exitosamente',
    resultado.data
  );
});

/**
 * @desc    Obtener registros de pago con filtros
 * @route   GET /api/admin/pagos-personal
 * @access  Private (Solo Administrador)
 */
export const obtenerRegistrosPago = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, año, mes, semana, estado, fechaInicio, fechaFin } =
    req.query;

  const opciones = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    sortBy,
    año: año ? parseInt(año) : undefined,
    mes: mes ? parseInt(mes) : undefined,
    semana: semana ? parseInt(semana) : undefined,
    estado,
    fechaInicio,
    fechaFin,
  };

  const resultado = await PagoPersonalService.obtenerRegistros({}, opciones);

  return ApiResponse.paginated(
    res,
    resultado.data.registros,
    resultado.data.pagination.page,
    resultado.data.pagination.limit,
    resultado.data.pagination.total,
    'Registros de pago obtenidos exitosamente'
  );
});

/**
 * @desc    Obtener un registro de pago por ID
 * @route   GET /api/admin/pagos-personal/:id
 * @access  Private (Solo Administrador)
 */
export const obtenerRegistroPagoPorId = asyncHandler(async (req, res) => {
  const resultado = await PagoPersonalService.obtenerRegistroPorId(
    req.params.id
  );

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Registro obtenido exitosamente',
    resultado.data
  );
});

/**
 * @desc    Actualizar un registro de pago
 * @route   PUT /api/admin/pagos-personal/:id
 * @access  Private (Solo Administrador)
 */
export const actualizarRegistroPago = asyncHandler(async (req, res) => {
  const resultado = await PagoPersonalService.actualizarRegistro(
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
 * @desc    Eliminar un registro de pago
 * @route   DELETE /api/admin/pagos-personal/:id
 * @access  Private (Solo Administrador)
 */
export const eliminarRegistroPago = asyncHandler(async (req, res) => {
  const resultado = await PagoPersonalService.eliminarRegistro(req.params.id);

  return ApiResponse.success(res, HTTP_STATUS.OK, resultado.message);
});

/**
 * @desc    Obtener estadísticas de pagos del personal
 * @route   GET /api/admin/pagos-personal/estadisticas
 * @access  Private (Solo Administrador)
 */
export const obtenerEstadisticasPagos = asyncHandler(async (req, res) => {
  const { año, mes, fechaInicio, fechaFin } = req.query;

  const filtros = {};
  if (año) filtros.año = parseInt(año);
  if (mes) filtros.mes = parseInt(mes);
  if (fechaInicio || fechaFin) {
    filtros.fecha = {};
    if (fechaInicio) filtros.fecha.$gte = new Date(fechaInicio);
    if (fechaFin) filtros.fecha.$lte = new Date(fechaFin);
  }

  const resultado = await PagoPersonalService.obtenerEstadisticas(filtros);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Estadísticas obtenidas exitosamente',
    resultado.data
  );
});

// ============================================
// ESTADÍSTICAS GENERALES DEL SISTEMA
// ============================================

/**
 * @desc    Obtener estadísticas generales del sistema
 * @route   GET /api/admin/estadisticas
 * @access  Private (Solo Administrador)
 */
export const obtenerEstadisticasSistema = asyncHandler(async (req, res) => {
  const resultado = await AdminService.obtenerEstadisticasSistema();

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Estadísticas del sistema obtenidas exitosamente',
    resultado.data
  );
});

