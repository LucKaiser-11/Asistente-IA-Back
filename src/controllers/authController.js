import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// Generar token JWT
const generarToken = (usuario) => {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' } // Token válido por 24 horas
  );
};

// Registrar nuevo usuario
export const registrar = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { nombres, apellido_paterno, apellido_materno, telefono, fecha_nacimiento, email, password } = req.body;

    // Validaciones básicas
    if (!nombres || !apellido_paterno || !email || !password) {
      return res.status(400).json({
        error: 'Campos requeridos',
        message: 'Nombres, apellido paterno, email y contraseña son obligatorios'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Email inválido',
        message: 'El formato del email no es válido'
      });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Contraseña débil',
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    await client.query('BEGIN');

    // Verificar si el email ya existe
    const emailExiste = await client.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (emailExiste.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Email en uso',
        message: 'Este email ya está registrado'
      });
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insertar persona
    const personaResult = await client.query(
      `INSERT INTO personas (nombres, apellido_paterno, apellido_materno, telefono, fecha_nacimiento)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [nombres, apellido_paterno, apellido_materno || null, telefono || null, fecha_nacimiento || null]
    );

    const personaId = personaResult.rows[0].id;

    // Insertar usuario
    const usuarioResult = await client.query(
      `INSERT INTO usuarios (persona_id, email, password, rol, activo)
       VALUES ($1, $2, $3, 'cliente', true)
       RETURNING id, email, rol, activo, created_at`,
      [personaId, email, passwordHash]
    );

    const usuario = usuarioResult.rows[0];

    // Registrar en logs
    await client.query(
      `INSERT INTO logs_sistema (usuario_id, accion, tipo, ip_address)
       VALUES ($1, 'REGISTRO_USUARIO', 'info', $2)`,
      [usuario.id, req.ip]
    );

    await client.query('COMMIT');

    // Generar token
    const token = generarToken(usuario);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      usuario: {
        id: usuario.id,
        nombres,
        apellido_paterno,
        apellido_materno,
        email: usuario.email,
        rol: usuario.rol,
        creado: usuario.created_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en registro:', error);
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudo completar el registro'
    });
  } finally {
    client.release();
  }
};

// Login de usuario
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones
    if (!email || !password) {
      return res.status(400).json({
        error: 'Campos requeridos',
        message: 'Email y contraseña son obligatorios'
      });
    }

    // Buscar usuario con sus datos de persona
    const result = await pool.query(
      `SELECT u.id, u.email, u.password, u.rol, u.activo,
              p.nombres, p.apellido_paterno, p.apellido_materno
       FROM usuarios u
       INNER JOIN personas p ON u.persona_id = p.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }

    const usuario = result.rows[0];

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return res.status(403).json({
        error: 'Cuenta desactivada',
        message: 'Tu cuenta ha sido desactivada. Contacta al administrador'
      });
    }

    // Verificar contraseña
    const passwordValido = await bcrypt.compare(password, usuario.password);

    if (!passwordValido) {
      // Registrar intento fallido
      await pool.query(
        `INSERT INTO logs_sistema (usuario_id, accion, tipo, ip_address)
         VALUES ($1, 'LOGIN_FALLIDO', 'warning', $2)`,
        [usuario.id, req.ip]
      );

      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }

    // Registrar login exitoso
    await pool.query(
      `INSERT INTO logs_sistema (usuario_id, accion, tipo, ip_address)
       VALUES ($1, 'LOGIN_EXITOSO', 'info', $2)`,
      [usuario.id, req.ip]
    );

    // Generar token
    const token = generarToken(usuario);

    res.json({
      message: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombres: usuario.nombres,
        apellido_paterno: usuario.apellido_paterno,
        apellido_materno: usuario.apellido_materno,
        email: usuario.email,
        rol: usuario.rol
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudo completar el login'
    });
  }
};

// Obtener perfil del usuario actual
export const obtenerPerfil = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.rol, u.activo, u.created_at,
              p.nombres, p.apellido_paterno, p.apellido_materno, 
              p.telefono, p.fecha_nacimiento
       FROM usuarios u
       INNER JOIN personas p ON u.persona_id = p.id
       WHERE u.id = $1`,
      [req.usuario.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      usuario: result.rows[0]
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      error: 'Error del servidor'
    });
  }
};
