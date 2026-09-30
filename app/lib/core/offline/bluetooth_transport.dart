/// Un ítem individual transferido por Bluetooth entre la manipuladora (sin
/// señal) y el dispositivo del coordinador. Espeja lo que ya viaja en
/// `ColaSincronizacionLocal`, más la identidad del dispositivo/usuario de
/// origen (el servidor la necesita para atribuir el cambio correctamente,
/// ver `dispositivoOrigen` en `/sincronizacion/lote`).
class ItemRelevoBluetooth {
  const ItemRelevoBluetooth({
    required this.dispositivoOrigenIdentificador,
    required this.dispositivoOrigenTipo,
    required this.usuarioOrigenId,
    required this.entidad,
    required this.entidadId,
    required this.operacion,
    required this.payload,
    required this.timestampLocal,
  });

  final String dispositivoOrigenIdentificador;
  final String dispositivoOrigenTipo;
  final String usuarioOrigenId;
  final String entidad;
  final String entidadId;
  final String operacion;
  final String payload;
  final DateTime timestampLocal;
}

/// Abstrae el transporte físico real (BLE) para que la lógica de relevo
/// (encolar, deduplicar, reanudar) se pueda probar sin hardware. Una
/// implementación concreta sobre un paquete como `flutter_blue_plus` o
/// `nearby_connections` queda fuera de este módulo: requiere permisos de
/// SO y un dispositivo físico para verificarse, lo que no se puede hacer
/// en este entorno de desarrollo.
abstract class BluetoothTransport {
  /// Envía un ítem y espera su confirmación de recepción por el otro
  /// extremo. Debe lanzar si el envío no se pudo confirmar (desconexión a
  /// mitad de transferencia, etc.) para que el emisor sepa que debe
  /// reintentarlo más tarde sin haberlo borrado de su cola local.
  Future<void> enviarItem(ItemRelevoBluetooth item);

  /// En el dispositivo receptor (coordinador): cada ítem que llega de un
  /// emisor emparejado.
  Stream<ItemRelevoBluetooth> recibirItems();
}
