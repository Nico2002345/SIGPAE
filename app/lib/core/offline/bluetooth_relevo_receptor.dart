import 'dart:async';

import 'package:drift/drift.dart';

import 'bluetooth_transport.dart';
import 'local_database.dart';

/// Lado coordinador (Fase 13 / regla 22): recibe los ítems que una
/// manipuladora releva por Bluetooth y los deja en `ColaBluetoothRecibida`
/// hasta que este dispositivo recupere señal y pueda reenviarlos al
/// servidor (ver [BluetoothReenvioService]).
///
/// La clave única (dispositivo de origen + entidadId) hace que recibir el
/// mismo ítem más de una vez —por ejemplo porque a la manipuladora se le
/// cortó la conexión justo después de enviarlo, sin alcanzar a ver la
/// confirmación, y lo reintenta— no lo duplique en la cola de este
/// dispositivo.
class BluetoothRelevoReceptor {
  BluetoothRelevoReceptor({required LocalDatabase db, required BluetoothTransport transport})
      : _db = db,
        _transport = transport;

  final LocalDatabase _db;
  final BluetoothTransport _transport;
  StreamSubscription<ItemRelevoBluetooth>? _subscripcion;

  void iniciarRecepcion() {
    _subscripcion?.cancel();
    _subscripcion = _transport.recibirItems().listen(_guardarItem);
  }

  Future<void> detenerRecepcion() async {
    await _subscripcion?.cancel();
    _subscripcion = null;
  }

  Future<void> _guardarItem(ItemRelevoBluetooth item) async {
    // insertOrIgnore: si este ítem ya se había recibido de este mismo
    // dispositivo de origen (la clave única de la tabla), el reintento se
    // descarta en silencio en vez de duplicarlo.
    await _db.into(_db.colaBluetoothRecibida).insert(
          ColaBluetoothRecibidaCompanion.insert(
            dispositivoOrigenIdentificador: item.dispositivoOrigenIdentificador,
            dispositivoOrigenTipo: item.dispositivoOrigenTipo,
            usuarioOrigenId: item.usuarioOrigenId,
            entidad: item.entidad,
            entidadId: item.entidadId,
            operacion: item.operacion,
            payload: item.payload,
            timestampLocal: item.timestampLocal,
          ),
          mode: InsertMode.insertOrIgnore,
        );
  }
}
