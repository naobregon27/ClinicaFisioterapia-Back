import mongoose from 'mongoose';

const auditoriaSchema = new mongoose.Schema(
  {
    // Usuario que realizó la acción
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // Tipo de acción realizada
    accion: {
      type: String,
      required: true,
      enum: [
        'crear',           // Crear recurso
        'actualizar',      // Actualizar recurso
        'eliminar',        // Eliminar recurso
        'iniciar_sesion',  // Login
        'cerrar_sesion',   // Logout
        'verificar_email', // Verificación de email
        'cambiar_password', // Cambio de contraseña
        'cambiar_rol',     // Cambio de rol de usuario
        'cambiar_estado',  // Cambio de estado de usuario
        'registrar_pago',  // Registrar pago
        'dar_alta_medica', // Alta médica
        'cancelar_sesion', // Cancelar sesión
        'reprogramar_sesion', // Reprogramar sesión
        'otro',            // Otras acciones
      ],
      index: true,
    },
    
    // Recurso afectado
    recurso: {
      tipo: {
        type: String,
        enum: ['usuario', 'paciente', 'sesion', 'pago_personal', 'sistema', 'otro'],
        required: true,
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      nombre: {
        type: String,
        default: null,
      }, // Nombre descriptivo del recurso (ej: "Juan Pérez" para un paciente)
    },
    
    // Descripción detallada de la acción
    descripcion: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Datos anteriores (para cambios)
    datosAnteriores: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    
    // Datos nuevos (para cambios)
    datosNuevos: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    
    // IP desde donde se realizó la acción
    ipAddress: {
      type: String,
      default: null,
    },
    
    // User Agent del navegador
    userAgent: {
      type: String,
      default: null,
    },
    
    // Método HTTP utilizado
    metodo: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      default: null,
    },
    
    // Ruta/endpoint utilizado
    ruta: {
      type: String,
      default: null,
    },
    
    // Estado de la acción (éxito o error)
    estado: {
      type: String,
      enum: ['exitoso', 'fallido', 'pendiente'],
      default: 'exitoso',
    },
    
    // Mensaje de error si falló
    error: {
      type: String,
      default: null,
    },
    
    // Metadata adicional
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Índices compuestos para consultas frecuentes
auditoriaSchema.index({ usuario: 1, createdAt: -1 });
auditoriaSchema.index({ accion: 1, createdAt: -1 });
auditoriaSchema.index({ 'recurso.tipo': 1, 'recurso.id': 1 });
auditoriaSchema.index({ createdAt: -1 });
auditoriaSchema.index({ estado: 1, createdAt: -1 });

// Índice para búsqueda por fecha
auditoriaSchema.index({ createdAt: -1, accion: 1 });

// Método estático para registrar una acción
auditoriaSchema.statics.registrar = async function(datos) {
  try {
    const auditoria = await this.create({
      usuario: datos.usuarioId,
      accion: datos.accion,
      recurso: datos.recurso || {},
      descripcion: datos.descripcion,
      datosAnteriores: datos.datosAnteriores,
      datosNuevos: datos.datosNuevos,
      ipAddress: datos.ipAddress,
      userAgent: datos.userAgent,
      metodo: datos.metodo,
      ruta: datos.ruta,
      estado: datos.estado || 'exitoso',
      error: datos.error,
      metadata: datos.metadata || {},
    });
    return auditoria;
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
    // No lanzar error para no interrumpir el flujo principal
    return null;
  }
};

const Auditoria = mongoose.model('Auditoria', auditoriaSchema);

export default Auditoria;


