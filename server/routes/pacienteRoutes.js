import express from 'express';
import {
  crearPaciente,
  obtenerPacientes,
  buscarPacientes,
  obtenerPacientePorId,
  actualizarPaciente,
  eliminarPaciente,
  darAltaMedica,
  obtenerEstadisticas,
} from '../controllers/pacienteController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  validateCrearPaciente,
  validateActualizarPaciente,
} from '../middlewares/pacienteValidation.js';
import { ROLES } from '../conf/constants.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas de estadísticas (antes de las rutas con :id)
router.get(
  '/estadisticas/resumen',
  authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO),
  obtenerEstadisticas
);

// Ruta de búsqueda rápida
router.get(
  '/buscar',
  authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO),
  buscarPacientes
);

// Rutas principales
router
  .route('/')
  .get(authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO), obtenerPacientes)
  .post(authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO), validateCrearPaciente, crearPaciente);

// Rutas específicas de un paciente
router
  .route('/:id')
  .get(authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO), obtenerPacientePorId)
  .put(authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO), validateActualizarPaciente, actualizarPaciente)
  .delete(authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO), eliminarPaciente);

// Alta médica
router.put(
  '/:id/alta',
  authorize(ROLES.ADMIN, ROLES.EMPLEADO, ROLES.USUARIO),
  darAltaMedica
);

export default router;


