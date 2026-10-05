import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:http/http.dart' as http;

import '../app_config.dart';
import 'asistencia_offline_repository.dart' show OfflineException;
import 'local_database.dart';

class ResultadoSincronizacion {
  const ResultadoSincronizacion({required this.total, required this.confirmados, required this.conflictos});

  final int total;
  final int confirmados;
  final int conflictos;
}

/// Envía la cola local de cambios pendientes al servidor (regla 21: "enviar
/// solamente los cambios pendientes, no toda la base de datos"). Si no hay
/// conexión, lanza [OfflineException] y no toca la cola: los cambios quedan
/// intactos para el próximo intento (regla 20: "no perder información si se
/// cierra la app antes de sincronizar").
class SincronizacionService {
  SincronizacionService({required LocalDatabase db, String? baseUrl, http.Client? httpClient})
      : _db = db,
        baseUrl = baseUrl ?? AppConfig.apiBaseUrl,
        _httpClient = httpClient ?? http.Client();

  final LocalDatabase _db;
  final String baseUrl;
  final http.Client _httpClient;

  Future<ResultadoSincronizacion> sincronizarPendientes({
    required String dispositivoId,
    required String accessToken,
  }) async {
    final pendientes = await _db.select(_db.colaSincronizacionLocal).get();
    if (pendientes.isEmpty) {
      return const ResultadoSincronizacion(total: 0, confirmados: 0, conflictos: 0);
    }

    final cuerpo = {
      'dispositivoId': dispositivoId,
      'tipo': 'INTERNET',
      'cambios': [
        for (final item in pendientes)
          {
            'entidad': item.entidad,
            'entidadId': item.entidadId,
            'operacion': 'UPDATE',
            'payload': jsonDecode(item.payload),
            'timestampLocal': item.creadoEn.toIso8601String(),
          },
      ],
    };

    final http.Response res;
    try {
      res = await _httpClient.post(
        Uri.parse('$baseUrl/sincronizacion/lote'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $accessToken'},
        body: jsonEncode(cuerpo),
      );
    } catch (_) {
      throw OfflineException('Sin conexión: los cambios quedan pendientes en este dispositivo.');
    }

    if (res.statusCode != 201) {
      throw OfflineException('El servidor rechazó el lote de sincronización.');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final resumen = data['resumen'] as Map<String, dynamic>;

    // Se limpia lo que se envió, haya quedado CONFIRMADO o CONFLICTO en el
    // servidor: los conflictos ya se auditan del lado servidor (tabla
    // cola_sincronizacion) y se resuelven con el flujo de solicitud de
    // modificación que ya existe, no reintentándolos a ciegas acá.
    await _db.transaction(() async {
      for (final item in pendientes) {
        await (_db.delete(_db.colaSincronizacionLocal)..where((t) => t.id.equals(item.id))).go();
      }
      await (_db.update(_db.asistenciasLocales)..where((t) => t.sincronizado.equals(false)))
          .write(const AsistenciasLocalesCompanion(sincronizado: Value(true)));
    });

    return ResultadoSincronizacion(
      total: resumen['total'] as int,
      confirmados: resumen['confirmados'] as int,
      conflictos: resumen['conflictos'] as int,
    );
  }
}
