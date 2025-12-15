import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';

// Generar token JWT
const generarToken = (usuario) => {
  return jwt.sign(
    {
      id: usuario.usuario_id,
      email: usuario.email,
      rol: usuario.rol
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Registrar nuevo usuario
export const registrar = async (req, res) => {
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

    // Verificar si el email ya existe
    const emailExiste = await prisma.usuarios.findUnique({
      where: { email }
    });

    if (emailExiste) {
      return res.status(409).json({
        error: 'Email en uso',
        message: 'Este email ya está registrado'
      });
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Crear persona y usuario en una transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Insertar persona
      const persona = await tx.personas.create({
        data: {
          nombres,
          apellido_paterno,
          apellido_materno: apellido_materno || null,
          telefono: telefono || null,
          fecha_nacimiento: fecha_nacimiento || null
        }
      });

      // Insertar usuario
      const usuario = await tx.usuarios.create({
        data: {
          persona_id: persona.persona_id,
          email,
          password: passwordHash,
          rol: 'cliente',
          activo: true
        }
      });

      // Registrar en logs
      await tx.logs_sistema.create({
        data: {
          usuario_id: usuario.usuario_id,
          accion: 'REGISTRO_USUARIO',
          tipo: 'info',
          ip_address: req.ip
        }
      });

      return { usuario, persona };
    });

    // Generar token
    const token = generarToken(resultado.usuario);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      usuario: {
        id: resultado.usuario.usuario_id,
        nombres,
        apellido_paterno,
        apellido_materno,
        email: resultado.usuario.email,
        rol: resultado.usuario.rol,
        creado: resultado.usuario.created_at
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudo completar el registro'
    });
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
    const usuario = await prisma.usuarios.findUnique({
      where: { email },
      include: {
        personas: true
      }
    });

    if (!usuario) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }

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
      await prisma.logs_sistema.create({
        data: {
          usuario_id: usuario.usuario_id,
          accion: 'LOGIN_FALLIDO',
          tipo: 'warning',
          ip_address: req.ip
        }
      });

      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }

    // Registrar login exitoso
    await prisma.logs_sistema.create({
      data: {
        usuario_id: usuario.usuario_id,
        accion: 'LOGIN_EXITOSO',
        tipo: 'info',
        ip_address: req.ip
      }
    });

    // Generar token
    const token = generarToken(usuario);

    res.json({
      message: 'Login exitoso',
      token,
      usuario: {
        id: usuario.usuario_id,
        nombres: usuario.personas.nombres,
        apellido_paterno: usuario.personas.apellido_paterno,
        apellido_materno: usuario.personas.apellido_materno,
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
    const usuario = await prisma.usuarios.findUnique({
      where: { usuario_id: req.usuario.id },
      include: {
        personas: true
      }
    });

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      usuario: {
        id: usuario.usuario_id,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo,
        created_at: usuario.created_at,
        nombres: usuario.personas.nombres,
        apellido_paterno: usuario.personas.apellido_paterno,
        apellido_materno: usuario.personas.apellido_materno,
        telefono: usuario.personas.telefono,
        fecha_nacimiento: usuario.personas.fecha_nacimiento
      }
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      error: 'Error del servidor'
    });
  }
};
