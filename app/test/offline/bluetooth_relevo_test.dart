import 'dart:async';
import 'dart:convert';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sigpae_app/core/offline/asistencia_offline_repository.dart' show OfflineException;
import 'package:sigpae_app/core/offline/bluetooth_reenvio_service.dart';
import 'package:sigpae_app/core/offline/bluetooth_relevo_emisor.dart';
import 'package:sigpae_app/core/offline/bluetooth_relevo_receptor.dart';
import 'package:sigpae_app/core/offline/bluetooth_transport.dart';
import 'package:sigpae_app/core/offline/local_database.dart';

/// Transporte en memoria para probar la lógica de relevo sin hardware: un
/// `enviarItem` se entrega directamente al stream `recibirItems` del mismo
/// objeto, como si emisor y receptor estuvieran ya emparejados.
class TransporteFalso implements BluetoothTransport {
  final _controller = StreamController<ItemRelevoBluetooth>.broadcast();

  @override
  Future<void> enviarItem(ItemRelevoBluetooth item) async {
    _controller.add(item);
  }

  @override
  Stream<ItemRelevoBluetooth> recibirItems() => _controller.stream;
}

/// Variante que falla a partir del n-ésimo envío (para simular que la
/// conexión Bluetooth se corta a mitad de una transferencia de varios
/// ítems).
class TransporteQueFallaDesde implements BluetoothTransport {
  TransporteQueFallaDesde(this._fallarEnEnvioNumero);
  final int _fallarEnEnvioNumero;
  final _controller = StreamController<ItemRelevoBluetooth>.broadcast();
  int _envios = 0;

  @override
  Future<void> enviarItem(ItemRelevoBluetooth item) async {
    _envios += 1;
    if (_envios >= _fallarEnEnvioNumero) {
      throw Exception('conexión interrumpida');
    }
    _controller.add(item);
  }

  @override
  Stream<ItemRelevoBluetooth> recibirItems() => _controller.stream;
}

void main() {
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;

  LocalDatabase crearDb() => LocalDatabase.forTesting(NativeDatabase.memory());

  Future<void> encolarPendiente(LocalDatabase db, String entidadId) async {
    await db.into(db.asistenciasLocales).insert(
          AsistenciasLocalesCompanion.insert(
            id: entidadId,
            estudianteId: 'est-1',
            jornadaId: 'jor-1',
            estado: 'ASISTIO',
            fechaHoraRegistro: DateTime.now(),
          ),
        );
    await db.into(db.colaSincronizacionLocal).insert(
          ColaSincronizacionLocalCompanion.insert(
            entidad: 'Asistencia',
            entidadId: entidadId,
            payload: jsonEncode({'estudianteId': 'est-1', 'jornadaId': 'jor-1', 'estado': 'ASISTIO'}),
          ),
        );
  }

  test('el emisor transfiere toda la cola y la deja vacía cuando todo se confirma', () async {
    final dbManipuladora = crearDb();
    await encolarPendiente(dbManipuladora, 'local-1');
    await encolarPendiente(dbManipuladora, 'local-2');

    final transporte = TransporteFalso();
    final emisor = BluetoothRelevoEmisor(
      db: dbManipuladora,
      transport: transporte,
      identificadorLocal: 'tablet-manipuladora-1',
      tipoDispositivo: 'ANDROID',
      usuarioId: 'user-manipuladora-1',
    );

    final transferidos = await emisor.relevarPendientes();

    expect(transferidos, 2);
    final pendientes = await dbManipuladora.select(dbManipuladora.colaSincronizacionLocal).get();
    expect(pendientes, isEmpty);
  });

  test('si la transferencia se interrumpe, lo no confirmado queda en la cola para el próximo encuentro', () async {
    final dbManipuladora = crearDb();
    await encolarPendiente(dbManipuladora, 'local-1');
    await encolarPendiente(dbManipuladora, 'local-2');

    // El primer ítem se confirma, el segundo se interrumpe.
    final emisor = BluetoothRelevoEmisor(
      db: dbManipuladora,
      transport: TransporteQueFallaDesde(2),
      identificadorLocal: 'tablet-manipuladora-1',
      tipoDispositivo: 'ANDROID',
      usuarioId: 'user-manipuladora-1',
    );

    final transferidos = await emisor.relevarPendientes();

    expect(transferidos, 1);
    final pendientes = await dbManipuladora.select(dbManipuladora.colaSincronizacionLocal).get();
    expect(pendientes, hasLength(1));
    expect(pendientes.single.entidadId, 'local-2');
  });

  test('el receptor deja los ítems en la cola del coordinador y deduplica reintentos', () async {
    final dbCoordinador = crearDb();
    final transporte = TransporteFalso();
    final receptor = BluetoothRelevoReceptor(db: dbCoordinador, transport: transporte);
    receptor.iniciarRecepcion();

    final item = ItemRelevoBluetooth(
      dispositivoOrigenIdentificador: 'tablet-manipuladora-1',
      dispositivoOrigenTipo: 'ANDROID',
      usuarioOrigenId: 'user-manipuladora-1',
      entidad: 'Asistencia',
      entidadId: 'local-1',
      operacion: 'UPDATE',
      payload: jsonEncode({'estudianteId': 'est-1', 'jornadaId': 'jor-1', 'estado': 'ASISTIO'}),
      timestampLocal: DateTime.now(),
    );

    await transporte.enviarItem(item);
    await transporte.enviarItem(item); // reintento del mismo ítem
    await Future<void>.delayed(Duration.zero);

    final recibidos = await dbCoordinador.select(dbCoordinador.colaBluetoothRecibida).get();
    expect(recibidos, hasLength(1));
    expect(recibidos.single.entidadId, 'local-1');

    await receptor.detenerRecepcion();
  });

  test('el reenvío agrupa por dispositivo de origen y limpia la cola al confirmarse', () async {
    final dbCoordinador = crearDb();
    await dbCoordinador.into(dbCoordinador.colaBluetoothRecibida).insert(
          ColaBluetoothRecibidaCompanion.insert(
            dispositivoOrigenIdentificador: 'tablet-manipuladora-1',
            dispositivoOrigenTipo: 'ANDROID',
            usuarioOrigenId: 'user-manipuladora-1',
            entidad: 'Asistencia',
            entidadId: 'local-1',
            operacion: 'UPDATE',
            payload: jsonEncode({'estudianteId': 'est-1', 'jornadaId': 'jor-1', 'estado': 'ASISTIO'}),
            timestampLocal: DateTime.now(),
          ),
        );

    late Map<String, dynamic> cuerpoEnviado;
    final cliente = MockClient((request) async {
      cuerpoEnviado = jsonDecode(request.body) as Map<String, dynamic>;
      return http.Response(
        jsonEncode({
          'resumen': {'total': 1, 'confirmados': 1, 'conflictos': 0},
        }),
        201,
      );
    });

    final servicio = BluetoothReenvioService(db: dbCoordinador, httpClient: cliente);
    final lotes = await servicio.reenviarPendientes(dispositivoId: 'disp-coordinador', accessToken: 'token');

    expect(lotes, 1);
    expect(cuerpoEnviado['tipo'], 'BLUETOOTH');
    expect(cuerpoEnviado['dispositivoId'], 'disp-coordinador');
    expect(cuerpoEnviado['dispositivoOrigen'], {
      'identificadorUnico': 'tablet-manipuladora-1',
      'tipo': 'ANDROID',
      'usuarioId': 'user-manipuladora-1',
    });

    final restantes = await dbCoordinador.select(dbCoordinador.colaBluetoothRecibida).get();
    expect(restantes, isEmpty);
  });

  test('reenvío sin conexión: lanza OfflineException y conserva la cola recibida', () async {
    final dbCoordinador = crearDb();
    await dbCoordinador.into(dbCoordinador.colaBluetoothRecibida).insert(
          ColaBluetoothRecibidaCompanion.insert(
            dispositivoOrigenIdentificador: 'tablet-manipuladora-1',
            dispositivoOrigenTipo: 'ANDROID',
            usuarioOrigenId: 'user-manipuladora-1',
            entidad: 'Asistencia',
            entidadId: 'local-1',
            operacion: 'UPDATE',
            payload: jsonEncode({'estudianteId': 'est-1', 'jornadaId': 'jor-1', 'estado': 'ASISTIO'}),
            timestampLocal: DateTime.now(),
          ),
        );

    final cliente = MockClient((request) async => throw Exception('sin red'));
    final servicio = BluetoothReenvioService(db: dbCoordinador, httpClient: cliente);

    await expectLater(
      () => servicio.reenviarPendientes(dispositivoId: 'disp-coordinador', accessToken: 'token'),
      throwsA(isA<OfflineException>()),
    );

    final restantes = await dbCoordinador.select(dbCoordinador.colaBluetoothRecibida).get();
    expect(restantes, hasLength(1));
  });
}
