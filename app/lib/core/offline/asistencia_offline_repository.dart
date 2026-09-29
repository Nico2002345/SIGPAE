import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import 'local_database.dart';

class OfflineException implements Exception {
  OfflineException(this.message);
  final String message;
}

/// Repositorio offline-first de asistencia (regla 20 del spec): el docente
/// descarga estudiantes y jornada una vez con conexión, y a partir de ahí
/// puede consultar y registrar asistencia completamente sin conexión. Cada
/// registro local queda encolado en `ColaSincronizacionLocal`; drenar esa
/// cola contra el servidor es responsabilidad de la Fase 12
/// (Sincronización), no de este repositorio.
class AsistenciaOfflineRepository {
  AsistenciaOfflineRepository({required LocalDatabase db, String? baseUrl, http.Client? httpClient})
      : _db = db,
        baseUrl = baseUrl ?? 'http://localhost:3000',
        _httpClient = httpClient ?? http.Client();

  final LocalDatabase _db;
  final String baseUrl;
  final http.Client _httpClient;
  static const _uuid = Uuid();

  /// Requiere conexión. Reemplaza la copia local de estudiantes y jornadas
  /// de esta sede con lo que devuelva el servidor.
  Future<void> sincronizarDatosDeReferencia({required int sedeId, required String accessToken}) async {
    final http.Response estudiantesRes;
    final http.Response jornadasRes;
    try {
      estudiantesRes = await _httpClient.get(
        Uri.parse('$baseUrl/estudiantes?sedeId=$sedeId'),
        headers: {'Authorization': 'Bearer $accessToken'},
      );
      jornadasRes = await _httpClient.get(
        Uri.parse('$baseUrl/jornadas?sedeId=$sedeId'),
        headers: {'Authorization': 'Bearer $accessToken'},
      );
    } catch (_) {
      throw OfflineException('Sin conexión: no se pudo actualizar la lista de estudiantes ni la jornada.');
    }

    if (estudiantesRes.statusCode != 200) {
      throw OfflineException('No se pudo descargar la lista de estudiantes.');
    }
    if (jornadasRes.statusCode != 200) {
      throw OfflineException('No se pudo descargar la jornada de la sede.');
    }

    final estudiantesJson =
        (jsonDecode(estudiantesRes.body) as Map<String, dynamic>)['estudiantes'] as List<dynamic>;
    final jornadasJson = (jsonDecode(jornadasRes.body) as Map<String, dynamic>)['jornadas'] as List<dynamic>;

    await _db.transaction(() async {
      await (_db.delete(_db.estudiantesCache)..where((t) => t.sedeId.equals(sedeId))).go();
      for (final item in estudiantesJson) {
        final estudiante = item as Map<String, dynamic>;
        await _db.into(_db.estudiantesCache).insertOnConflictUpdate(
              EstudiantesCacheCompanion.insert(
                id: estudiante['id'] as String,
                idPae: estudiante['idPae'] as String,
                nombres: estudiante['nombres'] as String,
                apellidos: estudiante['apellidos'] as String,
                sedeId: sedeId,
                estado: estudiante['estado'] as String,
              ),
            );
      }

      await (_db.delete(_db.jornadasCache)..where((t) => t.sedeId.equals(sedeId))).go();
      for (final item in jornadasJson) {
        final jornada = item as Map<String, dynamic>;
        await _db.into(_db.jornadasCache).insertOnConflictUpdate(
              JornadasCacheCompanion.insert(
                id: jornada['id'] as String,
                sedeId: sedeId,
                fecha: DateTime.parse(jornada['fecha'] as String),
                estado: jornada['estado'] as String,
              ),
            );
      }
    });
  }

  /// Funciona sin conexión: lee de la copia local.
  Stream<List<EstudiantesCacheData>> observarEstudiantesDeSede(int sedeId) {
    return (_db.select(_db.estudiantesCache)..where((t) => t.sedeId.equals(sedeId))).watch();
  }

  /// Funciona sin conexión: la jornada abierta más reciente en la copia local.
  Future<JornadasCacheData?> jornadaAbiertaDeSede(int sedeId) async {
    final jornadas = await (_db.select(_db.jornadasCache)
          ..where((t) => t.sedeId.equals(sedeId))
          ..orderBy([(t) => OrderingTerm.desc(t.fecha)]))
        .get();
    for (final jornada in jornadas) {
      if (jornada.estado == 'ABIERTA' || jornada.estado == 'EN_ENTREGA') {
        return jornada;
      }
    }
    return null;
  }

  /// Funciona sin conexión: escribe de inmediato en la base local (upsert
  /// por estudiante+jornada, igual que el servidor) y encola el cambio.
  Future<void> registrarAsistenciaLocal({
    required String estudianteId,
    required String jornadaId,
    required String estado,
  }) async {
    final existente = await (_db.select(_db.asistenciasLocales)
          ..where((t) => t.estudianteId.equals(estudianteId) & t.jornadaId.equals(jornadaId)))
        .getSingleOrNull();

    final id = existente?.id ?? _uuid.v4();

    await _db.into(_db.asistenciasLocales).insertOnConflictUpdate(
          AsistenciasLocalesCompanion.insert(
            id: id,
            estudianteId: estudianteId,
            jornadaId: jornadaId,
            estado: estado,
            fechaHoraRegistro: DateTime.now(),
            sincronizado: const Value(false),
          ),
        );

    await _db.into(_db.colaSincronizacionLocal).insert(
          ColaSincronizacionLocalCompanion.insert(
            entidad: 'Asistencia',
            entidadId: id,
            payload: jsonEncode({'jornadaId': jornadaId, 'estudianteId': estudianteId, 'estado': estado}),
          ),
        );
  }

  /// Funciona sin conexión.
  Stream<List<AsistenciasLocale>> observarAsistenciasDeJornada(String jornadaId) {
    return (_db.select(_db.asistenciasLocales)..where((t) => t.jornadaId.equals(jornadaId))).watch();
  }

  /// Cuántos cambios locales todavía no se han enviado al servidor.
  Stream<int> observarPendientesDeSincronizar() {
    final query = _db.selectOnly(_db.colaSincronizacionLocal)
      ..addColumns([_db.colaSincronizacionLocal.id.count()]);
    return query.map((row) => row.read(_db.colaSincronizacionLocal.id.count()) ?? 0).watchSingle();
  }
}
