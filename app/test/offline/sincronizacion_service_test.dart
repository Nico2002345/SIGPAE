import 'dart:convert';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sigpae_app/core/offline/asistencia_offline_repository.dart' show OfflineException;
import 'package:sigpae_app/core/offline/local_database.dart';
import 'package:sigpae_app/core/offline/sincronizacion_service.dart';

void main() {
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;

  LocalDatabase crearDb() => LocalDatabase.forTesting(NativeDatabase.memory());

  Future<void> encolarPendiente(LocalDatabase db, {String entidadId = 'local-1'}) async {
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

  test('no hay pendientes: no llama al servidor y devuelve resumen en cero', () async {
    final db = crearDb();
    var llamadas = 0;
    final cliente = MockClient((request) async {
      llamadas += 1;
      return http.Response('{}', 200);
    });
    final service = SincronizacionService(db: db, httpClient: cliente);

    final resultado = await service.sincronizarPendientes(dispositivoId: 'disp-1', accessToken: 'token');

    expect(resultado.total, 0);
    expect(llamadas, 0);
  });

  test('envía la cola pendiente y la vacía cuando el servidor confirma', () async {
    final db = crearDb();
    await encolarPendiente(db);

    final cliente = MockClient((request) async {
      final cuerpo = jsonDecode(request.body) as Map<String, dynamic>;
      expect(cuerpo['dispositivoId'], 'disp-1');
      expect(cuerpo['tipo'], 'INTERNET');
      expect((cuerpo['cambios'] as List).length, 1);
      return http.Response(
        jsonEncode({
          'resumen': {'total': 1, 'confirmados': 1, 'conflictos': 0},
        }),
        201,
      );
    });
    final service = SincronizacionService(db: db, httpClient: cliente);

    final resultado = await service.sincronizarPendientes(dispositivoId: 'disp-1', accessToken: 'token');

    expect(resultado.confirmados, 1);
    final pendientes = await db.select(db.colaSincronizacionLocal).get();
    expect(pendientes, isEmpty);
    final asistencia = await (db.select(db.asistenciasLocales)
          ..where((t) => t.id.equals('local-1')))
        .getSingle();
    expect(asistencia.sincronizado, isTrue);
  });

  test('sin conexión: lanza OfflineException y deja la cola intacta para el próximo intento', () async {
    final db = crearDb();
    await encolarPendiente(db);

    final cliente = MockClient((request) async => throw Exception('sin red'));
    final service = SincronizacionService(db: db, httpClient: cliente);

    await expectLater(
      () => service.sincronizarPendientes(dispositivoId: 'disp-1', accessToken: 'token'),
      throwsA(isA<OfflineException>()),
    );

    final pendientes = await db.select(db.colaSincronizacionLocal).get();
    expect(pendientes, hasLength(1));
  });

  test('el servidor rechaza el lote: lanza OfflineException y conserva la cola', () async {
    final db = crearDb();
    await encolarPendiente(db);

    final cliente = MockClient((request) async => http.Response('error', 500));
    final service = SincronizacionService(db: db, httpClient: cliente);

    await expectLater(
      () => service.sincronizarPendientes(dispositivoId: 'disp-1', accessToken: 'token'),
      throwsA(isA<OfflineException>()),
    );

    final pendientes = await db.select(db.colaSincronizacionLocal).get();
    expect(pendientes, hasLength(1));
  });
}
