import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import '../app_config.dart';
import '../token_storage.dart';
import 'asistencia_offline_repository.dart' show OfflineException;

/// Identifica este dispositivo ante el servidor (regla 21: cada evento de
/// sincronización debe poder atribuirse a un dispositivo). El identificador
/// local se genera una sola vez y se guarda de forma persistente; el
/// registro en el servidor es idempotente (se puede repetir en cada
/// arranque sin crear dispositivos duplicados).
class DispositivoRepository {
  DispositivoRepository({TokenStorage? storage, String? baseUrl, http.Client? httpClient})
      : _storage = storage ?? const SecureTokenStorage(),
        baseUrl = baseUrl ?? AppConfig.apiBaseUrl,
        _httpClient = httpClient ?? http.Client();

  final TokenStorage _storage;
  final String baseUrl;
  final http.Client _httpClient;

  static const _idLocalKey = 'sigpae_dispositivo_id_local';
  static const _uuid = Uuid();

  Future<String> identificadorLocal() async {
    final existente = await _storage.read(_idLocalKey);
    if (existente != null) return existente;
    final nuevo = _uuid.v4();
    await _storage.write(_idLocalKey, nuevo);
    return nuevo;
  }

  /// Requiere conexión. Devuelve el id que el servidor le asigna a este
  /// dispositivo (distinto del identificador local persistido arriba).
  Future<String> registrar({required String accessToken, required String tipo, String? nombre}) async {
    final identificadorUnico = await identificadorLocal();

    final http.Response res;
    try {
      res = await _httpClient.post(
        Uri.parse('$baseUrl/dispositivos/registrar'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $accessToken'},
        body: jsonEncode({
          'identificadorUnico': identificadorUnico,
          'tipo': tipo,
          'nombre': ?nombre,
        }),
      );
    } catch (_) {
      throw OfflineException('Sin conexión: no se pudo registrar el dispositivo.');
    }

    if (res.statusCode != 201) {
      throw OfflineException('No se pudo registrar el dispositivo ante el servidor.');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return (data['dispositivo'] as Map<String, dynamic>)['id'] as String;
  }
}
