import express from 'express';
import { registrar, login, obtenerPerfil } from '../controllers/authController.js';
import { verificarToken } from '../middleware/auth.js';

const router = express.Router();

// Rutas públicas (sin autenticación)
router.post('/register', registrar);
router.post('/login', login);

// Rutas protegidas (requieren autenticación)
router.get('/me', verificarToken, obtenerPerfil);

export default router;
