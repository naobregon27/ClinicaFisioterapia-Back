import express from 'express';
import {
  registrarSesion,
  obtenerSesiones,
  obtenerPlanillaDiaria,
  obtenerHistorialPaciente,
  actualizarSesion,
  registrarPago,
  cancelarSesion,
  obtenerEstadisticas,
  obtenerPagosPendientes,
} from '../controllers/sesionController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  validateRegistrarSesion,
  validateActualizarSesion,
  validateRegistrarPago,
} from '../middlewares/sesionValidation.js';
import { ROLES } from '../conf/constants.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas especiales (antes de las rutas con :id)
router.get(
  '/planilla-diaria',
  authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO),
  obtenerPlanillaDiaria
);

router.get(
  '/estadisticas/resumen',
  authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO),
  obtenerEstadisticas
);

router.get(
  '/pagos-pendientes',
  authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO),
  obtenerPagosPendientes
);

router.get(
  '/paciente/:pacienteId',
  authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO),
  obtenerHistorialPaciente
);

// Rutas principales
router
  .route('/')
  .get(authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO), obtenerSesiones)
  .post(authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO), validateRegistrarSesion, registrarSesion);

// Rutas específicas de una sesión
router
  .route('/:id')
  .put(authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO), validateActualizarSesion, actualizarSesion);

// Registrar pago
router.put(
  '/:id/pago',
  authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO),
  validateRegistrarPago,
  registrarPago
);

// Cancelar sesión
router.put(
  '/:id/cancelar',
  authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO),
  cancelarSesion
);

export default router;


