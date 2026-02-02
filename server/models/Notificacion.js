import mongoose from 'mongoose';

const notificacionSchema = new mongoose.Schema(
  {
    // Usuario destinatario
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // Tipo de notificación
    tipo: {
      type: String,
      required: true,
      enum: [
        'sesion_proxima',        // Sesión próxima (mañana/próximas 24h)
        'pago_pendiente',        // Pago pendiente
        'paciente_nuevo',        // Nuevo paciente registrado
        'sesion_cancelada',      // Sesión cancelada
        'sesion_reprogramada',   // Sesión reprogramada
        'alta_medica_pendiente', // Alta médica pendiente
        'recordatorio',          // Recordatorio general
        'sistema',               // Notificación del sistema
      ],
      index: true,
    },
    
    // Título de la notificación
    titulo: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'El título no puede exceder 100 caracteres'],
    },
    
    // Mensaje de la notificación
    mensaje: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'El mensaje no puede exceder 500 caracteres'],
    },
    
    // Datos adicionales relacionados
    datos: {
      pacienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente' },
      sesionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sesion' },
      monto: { type: Number },
      fecha: { type: Date },
      url: { type: String }, // URL para redirigir al hacer clic
      metadata: { type: mongoose.Schema.Types.Mixed },
    },
    
    // Estado de lectura
    leida: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    // Fecha de lectura
    fechaLectura: {
      type: Date,
      default: null,
    },
    
    // Prioridad
    prioridad: {
      type: String,
      enum: ['baja', 'media', 'alta', 'urgente'],
      default: 'media',
    },
    
    // Fecha de expiración (opcional)
    fechaExpiracion: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Índices compuestos para consultas frecuentes
notificacionSchema.index({ usuario: 1, leida: 1, createdAt: -1 });
notificacionSchema.index({ usuario: 1, tipo: 1, createdAt: -1 });
notificacionSchema.index({ fechaExpiracion: 1 }, { expireAfterSeconds: 0 }); // Auto-eliminar expiradas

// Método estático para crear notificación
notificacionSchema.statics.crearNotificacion = async function(datos) {
  try {
    const notificacion = await this.create({
      usuario: datos.usuarioId,
      tipo: datos.tipo,
      titulo: datos.titulo,
      mensaje: datos.mensaje,
      datos: datos.datos || {},
      prioridad: datos.prioridad || 'media',
      fechaExpiracion: datos.fechaExpiracion || null,
    });
    
    return notificacion;
  } catch (error) {
    console.error('Error al crear notificación:', error);
    return null;
  }
};

// Método estático para crear notificaciones múltiples
notificacionSchema.statics.crearNotificacionesMultiples = async function(notificaciones) {
  try {
    const creadas = await this.insertMany(notificaciones);
    return creadas;
  } catch (error) {
    console.error('Error al crear notificaciones múltiples:', error);
    return [];
  }
};

// Método para marcar como leída
notificacionSchema.methods.marcarComoLeida = async function() {
  this.leida = true;
  this.fechaLectura = new Date();
  return await this.save();
};

const Notificacion = mongoose.model('Notificacion', notificacionSchema);

export default Notificacion;
