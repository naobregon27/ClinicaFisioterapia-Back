import Paciente from '../models/Paciente.js';
import Sesion from '../models/Sesion.js';
import User from '../models/User.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * Servicio de búsqueda global rápida
 */
class BusquedaService {
  /**
   * Búsqueda global en pacientes, sesiones y usuarios
   */
  static async busquedaGlobal(termino, opciones = {}) {
    try {
      const { limit = 10, tipos = ['pacientes', 'sesiones', 'usuarios'] } = opciones;

      if (!termino || termino.trim().length < 2) {
        return {
          success: true,
          data: {
            pacientes: [],
            sesiones: [],
            usuarios: [],
            total: 0,
          },
        };
      }

      const busquedaRegex = new RegExp(termino.trim(), 'i');
      const resultados = {
        pacientes: [],
        sesiones: [],
        usuarios: [],
      };

      // Búsqueda en pacientes
      if (tipos.includes('pacientes')) {
        const pacientes = await Paciente.find({
          $or: [
            { nombre: busquedaRegex },
            { apellido: busquedaRegex },
            { dni: busquedaRegex },
            { telefono: busquedaRegex },
            { email: busquedaRegex },
          ],
        })
          .select('nombre apellido dni telefono email estado')
          .limit(limit)
          .lean();

        resultados.pacientes = pacientes.map(p => ({
          id: p._id,
          tipo: 'paciente',
          nombre: `${p.nombre} ${p.apellido}`,
          dni: p.dni,
          telefono: p.telefono,
          email: p.email,
          estado: p.estado,
          url: `/pacientes/${p._id}`,
        }));
      }

      // Búsqueda en sesiones (por paciente o fecha)
      if (tipos.includes('sesiones')) {
        // Primero buscar pacientes que coincidan
        const pacientesCoincidentes = await Paciente.find({
          $or: [
            { nombre: busquedaRegex },
            { apellido: busquedaRegex },
            { dni: busquedaRegex },
          ],
        }).select('_id').lean();

        const pacientesIds = pacientesCoincidentes.map(p => p._id);

        // Buscar sesiones por paciente o por fecha
        const querySesiones = {
          $or: [
            { paciente: { $in: pacientesIds } },
            // Buscar por fecha si el término parece una fecha
            ...(this._esFecha(termino) ? [{ fecha: new Date(termino) }] : []),
          ],
        };

        const sesiones = await Sesion.find(querySesiones)
          .populate('paciente', 'nombre apellido dni')
          .select('fecha horaEntrada horaSalida estado pago.monto pago.pagado')
          .sort('-fecha')
          .limit(limit)
          .lean();

        resultados.sesiones = sesiones.map(s => ({
          id: s._id,
          tipo: 'sesion',
          paciente: s.paciente ? `${s.paciente.nombre} ${s.paciente.apellido}` : 'N/A',
          fecha: s.fecha,
          horaEntrada: s.horaEntrada,
          horaSalida: s.horaSalida,
          estado: s.estado,
          monto: s.pago?.monto || 0,
          pagado: s.pago?.pagado || false,
          url: `/sesiones/${s._id}`,
        }));
      }

      // Búsqueda en usuarios
      if (tipos.includes('usuarios')) {
        const usuarios = await User.find({
          $or: [
            { nombre: busquedaRegex },
            { apellido: busquedaRegex },
            { email: busquedaRegex },
          ],
        })
          .select('nombre apellido email rol estado')
          .limit(limit)
          .lean();

        resultados.usuarios = usuarios.map(u => ({
          id: u._id,
          tipo: 'usuario',
          nombre: `${u.nombre} ${u.apellido}`,
          email: u.email,
          rol: u.rol,
          estado: u.estado,
          url: `/admin/usuarios/${u._id}`,
        }));
      }

      const total = resultados.pacientes.length + resultados.sesiones.length + resultados.usuarios.length;

      return {
        success: true,
        data: {
          ...resultados,
          total,
          termino: termino.trim(),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verificar si un término parece una fecha
   */
  static _esFecha(termino) {
    // Formato básico: YYYY-MM-DD o DD/MM/YYYY
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/;
    return fechaRegex.test(termino.trim());
  }
}

export default BusquedaService;
