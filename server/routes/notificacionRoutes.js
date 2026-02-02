import express from 'express';
import {
  obtenerNotificaciones,
  obtenerNotificacionesNoLeidas,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion,
} from '../controllers/notificacionController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas principales
router.get('/', obtenerNotificaciones);
router.get('/no-leidas', obtenerNotificacionesNoLeidas);
router.put('/leer-todas', marcarTodasComoLeidas);
router.put('/:id/leer', marcarComoLeida);
router.delete('/:id', eliminarNotificacion);

export default router;
