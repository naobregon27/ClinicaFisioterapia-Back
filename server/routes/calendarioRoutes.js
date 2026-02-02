import express from 'express';
import {
  obtenerSesionesPorRango,
  obtenerSesionesAgrupadas,
} from '../controllers/calendarioController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas principales
router.get('/sesiones', obtenerSesionesPorRango);
router.get('/sesiones-agrupadas', obtenerSesionesAgrupadas);

export default router;
