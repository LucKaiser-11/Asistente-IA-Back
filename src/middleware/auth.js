import jwt from 'jsonwebtoken';

// Middleware para verificar el token JWT
export const verificarToken = (req, res, next) => {
  try {
    // Obtener token del header
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Token no proporcionado',
        message: 'Debes iniciar sesión'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Agregar info del usuario al request
    req.usuario = {
      id: decoded.id,
      email: decoded.email,
      rol: decoded.rol
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        message: 'Tu sesión ha expirado, inicia sesión nuevamente'
      });
    }
    
    return res.status(401).json({
      error: 'Token inválido',
      message: 'El token proporcionado no es válido'
    });
  }
};

// Middleware para verificar rol de administrador
export const esAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'No tienes permisos de administrador'
    });
  }
  next();
};
