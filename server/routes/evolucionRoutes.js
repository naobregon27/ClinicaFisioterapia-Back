import express from 'express';
import { obtenerDatosEvolucion } from '../controllers/evolucionController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Ruta principal
router.get('/paciente/:pacienteId', obtenerDatosEvolucion);

export default router;
