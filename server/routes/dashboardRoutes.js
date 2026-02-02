import express from 'express';
import { obtenerMetricas } from '../controllers/dashboardController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Ruta principal
router.get('/metricas', obtenerMetricas);

export default router;
