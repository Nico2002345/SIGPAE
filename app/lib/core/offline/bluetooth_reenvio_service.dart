import 'dart:convert';

import 'package:http/http.dart' as http;

import 'asistencia_offline_repository.dart' show OfflineException;
import 'local_database.dart';

/// Lado coordinador (Fase 13 / regla 22), segunda mitad: cuando este
/// dispositivo recupera señal, reenvía al servidor lo que fue quedando en
/// `ColaBluetoothRecibida` durante los encuentros Bluetooth con
/// manipuladoras sin conexión.
///
/// Reutiliza el mismo endpoint `/sincronizacion/lote` que la Fase 12, con
/// `tipo: BLUETOOTH` y el `dispositivoOrigen` de cada manipuladora, para que
/// el servidor atribuya cada cambio a quien realmente lo hizo (nunca al
/// coordinador) y aplique la misma deduplicación por dispositivo+entidadId
/// que hace reanudable un reintento.
class BluetoothReenvioService {
  BluetoothReenvioService({required LocalDatabase db, String? baseUrl, http.Client? httpClient})
      : _db = db,
        baseUrl = baseUrl ?? 'http://localhost:3000',
        _httpClient = httpClient ?? http.Client();

  final LocalDatabase _db;
  final String baseUrl;
  final http.Client _httpClient;

  /// Devuelve cuántos lotes de manipuladoras distintas se reenviaron.
  Future<int> reenviarPendientes({required String dispositivoId, required String accessToken}) async {
    final pendientes = await _db.select(_db.colaBluetoothRecibida).get();
    if (pendientes.isEmpty) return 0;

    final porOrigen = <String, List<ColaBluetoothRecibidaData>>{};
    for (final item in pendientes) {
      porOrigen.putIfAbsent(item.dispositivoOrigenIdentificador, () => []).add(item);
    }

    var lotesReenviados = 0;
    for (final entrada in porOrigen.entries) {
      final items = entrada.value;
      final cuerpo = {
        'dispositivoId': dispositivoId,
        'tipo': 'BLUETOOTH',
        'dispositivoOrigen': {
          'identificadorUnico': items.first.dispositivoOrigenIdentificador,
          'tipo': items.first.dispositivoOrigenTipo,
          'usuarioId': items.first.usuarioOrigenId,
        },
        'cambios': [
          for (final item in items)
            {
              'entidad': item.entidad,
              'entidadId': item.entidadId,
              'operacion': item.operacion,
              'payload': jsonDecode(item.payload),
              'timestampLocal': item.timestampLocal.toIso8601String(),
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
        throw OfflineException('Sin conexión: los relevos Bluetooth quedan pendientes en este dispositivo.');
      }

      if (res.statusCode != 201) {
        throw OfflineException('El servidor rechazó el reenvío de un relevo Bluetooth.');
      }

      await _db.transaction(() async {
        for (final item in items) {
          await (_db.delete(_db.colaBluetoothRecibida)..where((t) => t.id.equals(item.id))).go();
        }
      });
      lotesReenviados += 1;
    }

    return lotesReenviados;
  }
}
