import 'bluetooth_transport.dart';
import 'local_database.dart';

/// Lado manipuladora (Fase 13 / regla 22): transfiere la cola local de
/// cambios pendientes a un coordinador cercano por Bluetooth, uno por uno.
///
/// Reanudable a propósito: cada ítem se borra de la cola local solo después
/// de que `transport.enviarItem` confirma que el coordinador lo recibió. Si
/// la conexión se corta a mitad de la transferencia, los ítems ya
/// confirmados no se reenvían y los que faltan quedan intactos para el
/// próximo intento — no hace falta ningún estado adicional de "progreso".
///
/// Deliberadamente NO espera una confirmación del servidor (eso ocurriría
/// más tarde, cuando el coordinador tenga señal): una vez que el
/// coordinador aceptó el ítem, la responsabilidad de entregarlo pasa a su
/// dispositivo, igual que un sobre físico entregado en mano.
class BluetoothRelevoEmisor {
  BluetoothRelevoEmisor({
    required LocalDatabase db,
    required BluetoothTransport transport,
    required String identificadorLocal,
    required String tipoDispositivo,
    required String usuarioId,
  })  : _db = db,
        _transport = transport,
        _identificadorLocal = identificadorLocal,
        _tipoDispositivo = tipoDispositivo,
        _usuarioId = usuarioId;

  final LocalDatabase _db;
  final BluetoothTransport _transport;
  final String _identificadorLocal;
  final String _tipoDispositivo;
  final String _usuarioId;

  /// Devuelve cuántos ítems se transfirieron antes de que se interrumpiera
  /// (o todos, si no hubo interrupción).
  Future<int> relevarPendientes() async {
    final pendientes = await _db.select(_db.colaSincronizacionLocal).get();
    var transferidos = 0;

    for (final item in pendientes) {
      final itemRelevo = ItemRelevoBluetooth(
        dispositivoOrigenIdentificador: _identificadorLocal,
        dispositivoOrigenTipo: _tipoDispositivo,
        usuarioOrigenId: _usuarioId,
        entidad: item.entidad,
        entidadId: item.entidadId,
        operacion: 'UPDATE',
        payload: item.payload,
        timestampLocal: item.creadoEn,
      );

      try {
        await _transport.enviarItem(itemRelevo);
      } catch (_) {
        // Se interrumpió la transferencia: lo ya confirmado queda borrado
        // arriba, esto y lo que sigue se reintenta en el próximo encuentro.
        return transferidos;
      }

      await (_db.delete(_db.colaSincronizacionLocal)..where((t) => t.id.equals(item.id))).go();
      transferidos += 1;
    }

    return transferidos;
  }
}
