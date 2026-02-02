import cron from 'node-cron';
import NotificacionService from '../services/notificacionService.js';
import RecordatorioService from '../services/recordatorioService.js';
import ResumenDiarioService from '../services/resumenDiarioService.js';
import colors from 'colors';

/**
 * Configuración de tareas programadas (cron jobs)
 */

// Ejecutar todos los días a las 8:00 AM - Generar notificaciones de sesiones próximas
cron.schedule('0 8 * * *', async () => {
  console.log(colors.cyan('[CRON] Generando notificaciones de sesiones próximas...'));
  try {
    const resultado = await NotificacionService.generarNotificacionesSesionesProximas();
    console.log(colors.green(`[CRON] ✓ ${resultado.message}`));
  } catch (error) {
    console.error(colors.red('[CRON] ✗ Error al generar notificaciones:'), error.message);
  }
});

// Ejecutar todos los días a las 8:00 AM - Generar notificaciones de pagos pendientes
cron.schedule('0 8 * * *', async () => {
  console.log(colors.cyan('[CRON] Generando notificaciones de pagos pendientes...'));
  try {
    const resultado = await NotificacionService.generarNotificacionesPagosPendientes();
    console.log(colors.green(`[CRON] ✓ ${resultado.message}`));
  } catch (error) {
    console.error(colors.red('[CRON] ✗ Error al generar notificaciones de pagos:'), error.message);
  }
});

// Ejecutar todos los días a las 8:00 AM - Enviar recordatorios de sesiones (24 horas antes)
cron.schedule('0 8 * * *', async () => {
  console.log(colors.cyan('[CRON] Enviando recordatorios de sesiones (24h antes)...'));
  try {
    const resultado = await RecordatorioService.enviarRecordatorios24Horas();
    console.log(colors.green(`[CRON] ✓ ${resultado.message}`));
  } catch (error) {
    console.error(colors.red('[CRON] ✗ Error al enviar recordatorios:'), error.message);
  }
});

// Ejecutar todos los días a las 7:00 AM - Enviar recordatorios del día
cron.schedule('0 7 * * *', async () => {
  console.log(colors.cyan('[CRON] Enviando recordatorios del día...'));
  try {
    const resultado = await RecordatorioService.enviarRecordatoriosDelDia();
    console.log(colors.green(`[CRON] ✓ ${resultado.message}`));
  } catch (error) {
    console.error(colors.red('[CRON] ✗ Error al enviar recordatorios del día:'), error.message);
  }
});

// Ejecutar todos los días a las 20:00 (8 PM) - Enviar resumen diario
cron.schedule('0 20 * * *', async () => {
  console.log(colors.cyan('[CRON] Enviando resumen diario...'));
  try {
    const resultado = await ResumenDiarioService.enviarResumenDiario();
    console.log(colors.green(`[CRON] ✓ ${resultado.message}`));
  } catch (error) {
    console.error(colors.red('[CRON] ✗ Error al enviar resumen diario:'), error.message);
  }
});

console.log(colors.green('✓ Tareas programadas (cron jobs) configuradas correctamente'));

export default cron;
