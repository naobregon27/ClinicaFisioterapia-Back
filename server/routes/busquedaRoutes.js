import express from 'express';
import { busquedaGlobal } from '../controllers/busquedaController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Ruta principal
router.get('/', busquedaGlobal);

export default router;
