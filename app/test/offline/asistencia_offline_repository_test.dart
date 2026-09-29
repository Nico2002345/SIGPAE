import 'dart:convert';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sigpae_app/core/offline/asistencia_offline_repository.dart';
import 'package:sigpae_app/core/offline/local_database.dart';

void main() {
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;

  AsistenciaOfflineRepository crearRepositorio(http.Client httpClient) =>
      AsistenciaOfflineRepository(db: LocalDatabase.forTesting(NativeDatabase.memory()), httpClient: httpClient);

  http.Client clienteConDatos({required List<dynamic> estudiantes, required List<dynamic> jornadas}) {
    return MockClient((request) async {
      if (request.url.path == '/estudiantes') {
        return http.Response(jsonEncode({'estudiantes': estudiantes}), 200);
      }
      if (request.url.path == '/jornadas') {
        return http.Response(jsonEncode({'jornadas': jornadas}), 200);
      }
      return http.Response('No encontrado', 404);
    });
  }

  final estudiantesEjemplo = [
    {'id': 'est-1', 'idPae': 'PAE-2026-000001', 'nombres': 'Ana', 'apellidos': 'Pérez', 'estado': 'ACTIVO'},
    {'id': 'est-2', 'idPae': 'PAE-2026-000002', 'nombres': 'Luis', 'apellidos': 'Gómez', 'estado': 'ACTIVO'},
  ];
  final jornadaEjemplo = [
    {'id': 'jor-1', 'sedeId': 5, 'fecha': '2026-10-01', 'estado': 'ABIERTA'},
  ];

  test('sincroniza estudiantes y jornada desde el servidor y los deja disponibles localmente', () async {
    final repo = crearRepositorio(clienteConDatos(estudiantes: estudiantesEjemplo, jornadas: jornadaEjemplo));

    await repo.sincronizarDatosDeReferencia(sedeId: 5, accessToken: 'token');

    final estudiantesLocales = await repo.observarEstudiantesDeSede(5).first;
    expect(estudiantesLocales, hasLength(2));
    expect(estudiantesLocales.map((e) => e.idPae), containsAll(['PAE-2026-000001', 'PAE-2026-000002']));

    final jornada = await repo.jornadaAbiertaDeSede(5);
    expect(jornada, isNotNull);
    expect(jornada!.id, 'jor-1');
  });

  test('registrar asistencia sin conexión funciona sobre los datos ya sincronizados y encola el cambio', () async {
    final repo = crearRepositorio(clienteConDatos(estudiantes: estudiantesEjemplo, jornadas: jornadaEjemplo));
    await repo.sincronizarDatosDeReferencia(sedeId: 5, accessToken: 'token');

    await repo.registrarAsistenciaLocal(estudianteId: 'est-1', jornadaId: 'jor-1', estado: 'ASISTIO');

    final asistencias = await repo.observarAsistenciasDeJornada('jor-1').first;
    expect(asistencias, hasLength(1));
    expect(asistencias.single.estado, 'ASISTIO');

    final pendientes = await repo.observarPendientesDeSincronizar().first;
    expect(pendientes, 1);
  });

  test('corregir la asistencia del mismo estudiante actualiza el registro en vez de duplicarlo', () async {
    final repo = crearRepositorio(clienteConDatos(estudiantes: estudiantesEjemplo, jornadas: jornadaEjemplo));
    await repo.sincronizarDatosDeReferencia(sedeId: 5, accessToken: 'token');

    await repo.registrarAsistenciaLocal(estudianteId: 'est-1', jornadaId: 'jor-1', estado: 'NO_ASISTIO');
    await repo.registrarAsistenciaLocal(estudianteId: 'est-1', jornadaId: 'jor-1', estado: 'ASISTIO');

    final asistencias = await repo.observarAsistenciasDeJornada('jor-1').first;
    expect(asistencias, hasLength(1));
    expect(asistencias.single.estado, 'ASISTIO');

    // Dos encolados: uno por cada corrección, como espejo simplificado de
    // la cola de sincronización (Fase 12 decide cómo colapsarlos).
    final pendientes = await repo.observarPendientesDeSincronizar().first;
    expect(pendientes, 2);
  });

  test('cuando se pierde la conexión, lanza OfflineException pero conserva los datos de la última sincronización', () async {
    var sinRed = false;
    final cliente = MockClient((request) async {
      if (sinRed) throw Exception('sin red');
      if (request.url.path == '/estudiantes') {
        return http.Response(jsonEncode({'estudiantes': estudiantesEjemplo}), 200);
      }
      if (request.url.path == '/jornadas') {
        return http.Response(jsonEncode({'jornadas': jornadaEjemplo}), 200);
      }
      return http.Response('No encontrado', 404);
    });
    final repo = crearRepositorio(cliente);

    await repo.sincronizarDatosDeReferencia(sedeId: 5, accessToken: 'token');

    sinRed = true;
    await expectLater(
      () => repo.sincronizarDatosDeReferencia(sedeId: 5, accessToken: 'token'),
      throwsA(isA<OfflineException>()),
    );

    final estudiantesLocales = await repo.observarEstudiantesDeSede(5).first;
    expect(estudiantesLocales, hasLength(2));
  });
}
