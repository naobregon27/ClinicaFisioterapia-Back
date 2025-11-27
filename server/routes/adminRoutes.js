import express from 'express';
import {
  // Gestión de usuarios
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  obtenerUsuariosColaboradores,
  actualizarUsuario,
  cambiarPasswordUsuario,
  cambiarRolUsuario,
  cambiarEstadoUsuario,
  desbloquearUsuario,
  eliminarUsuario,
  // Auditoría
  obtenerAuditoria,
  obtenerAccionesUsuario,
  obtenerEstadisticasAuditoria,
  // Planilla de pagos del personal
  crearOActualizarPago,
  crearMultiplesPagos,
  obtenerPlanillaMes,
  obtenerRegistrosPago,
  obtenerRegistroPagoPorId,
  actualizarRegistroPago,
  eliminarRegistroPago,
  obtenerEstadisticasPagos,
  // Estadísticas del sistema
  obtenerEstadisticasSistema,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../conf/constants.js';

const router = express.Router();

// Todas las rutas requieren autenticación Y ser administrador
router.use(protect);
router.use(authorize(ROLES.ADMIN));

// ============================================
// RUTAS DE GESTIÓN DE USUARIOS
// ============================================

router
  .route('/usuarios')
  .get(obtenerUsuarios)
  .post(crearUsuario);

router.get('/usuarios/colaboradores', obtenerUsuariosColaboradores);

// Rutas específicas deben ir ANTES de la ruta general /usuarios/:id
router.put('/usuarios/:id/password', cambiarPasswordUsuario);
router.put('/usuarios/:id/rol', cambiarRolUsuario);
router.put('/usuarios/:id/estado', cambiarEstadoUsuario);
router.put('/usuarios/:id/desbloquear', desbloquearUsuario);

router
  .route('/usuarios/:id')
  .get(obtenerUsuarioPorId)
  .put(actualizarUsuario)
  .delete(eliminarUsuario);

// ============================================
// RUTAS DE AUDITORÍA
// ============================================

router.get('/auditoria', obtenerAuditoria);
router.get('/auditoria/usuario/:usuarioId', obtenerAccionesUsuario);
router.get('/auditoria/estadisticas', obtenerEstadisticasAuditoria);

// ============================================
// RUTAS DE PLANILLA DE PAGOS DEL PERSONAL
// ============================================

router
  .route('/pagos-personal')
  .get(obtenerRegistrosPago)
  .post(crearOActualizarPago);

router.post('/pagos-personal/multiples', crearMultiplesPagos);
router.get('/pagos-personal/planilla', obtenerPlanillaMes);
router.get('/pagos-personal/estadisticas', obtenerEstadisticasPagos);

router
  .route('/pagos-personal/:id')
  .get(obtenerRegistroPagoPorId)
  .put(actualizarRegistroPago)
  .delete(eliminarRegistroPago);

// ============================================
// RUTAS DE ESTADÍSTICAS DEL SISTEMA
// ============================================

router.get('/estadisticas', obtenerEstadisticasSistema);

export default router;

