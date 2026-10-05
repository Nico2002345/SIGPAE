import 'dart:convert';

import 'package:http/http.dart' as http;

import 'app_config.dart';

class EntregasException implements Exception {
  EntregasException(this.message);
  final String message;
}

class JornadaResumen {
  JornadaResumen({required this.id, required this.estado});

  factory JornadaResumen.fromJson(Map<String, dynamic> json) =>
      JornadaResumen(id: json['id'] as String, estado: json['estado'] as String);

  final String id;
  final String estado;
}

class ResultadoEntrega {
  ResultadoEntrega({required this.resultado, this.motivoRechazo});

  factory ResultadoEntrega.fromJson(Map<String, dynamic> json) => ResultadoEntrega(
        resultado: json['resultado'] as String,
        motivoRechazo: json['motivoRechazo'] as String?,
      );

  final String resultado;
  final String? motivoRechazo;

  bool get autorizada => resultado == 'AUTORIZADA';
}

/// Registro de entregas de PAE vía escaneo de QR (permiso `entregas.registrar`:
/// OPERADOR/MANIPULADORA/COORDINADOR_LOGISTICO en el comedor).
class EntregasRepository {
  EntregasRepository({String? baseUrl, http.Client? httpClient})
      : baseUrl = baseUrl ?? AppConfig.apiBaseUrl,
        _httpClient = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _httpClient;

  /// Jornada abierta o en entrega para la sede, o null si no hay ninguna
  /// activa ahora mismo.
  Future<JornadaResumen?> jornadaActivaDeSede({required int sedeId, required String accessToken}) async {
    final http.Response res;
    try {
      res = await _httpClient.get(
        Uri.parse('$baseUrl/jornadas').replace(queryParameters: {'sedeId': '$sedeId'}),
        headers: {'Authorization': 'Bearer $accessToken'},
      );
    } catch (_) {
      throw EntregasException('No se pudo conectar con el servidor.');
    }

    if (res.statusCode != 200) {
      throw EntregasException(_extraerError(res.body) ?? 'No se pudieron consultar las jornadas de la sede.');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final jornadas = (data['jornadas'] as List).cast<Map<String, dynamic>>();
    final activa = jornadas.firstWhere(
      (j) => j['estado'] == 'ABIERTA' || j['estado'] == 'EN_ENTREGA',
      orElse: () => const {},
    );
    if (activa.isEmpty) return null;
    return JornadaResumen.fromJson(activa);
  }

  Future<ResultadoEntrega> registrarEntrega({
    required String token,
    required String jornadaId,
    required String accessToken,
    String tipo = 'NORMAL',
  }) async {
    final http.Response res;
    try {
      res = await _httpClient.post(
        Uri.parse('$baseUrl/entregas'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
        },
        body: jsonEncode({'token': token, 'jornadaId': jornadaId, 'tipo': tipo}),
      );
    } catch (_) {
      throw EntregasException('No se pudo conectar con el servidor.');
    }

    if (res.statusCode != 201) {
      throw EntregasException(_extraerError(res.body) ?? 'No se pudo registrar la entrega.');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return ResultadoEntrega.fromJson(data['entrega'] as Map<String, dynamic>);
  }

  String? _extraerError(String body) {
    try {
      final data = jsonDecode(body) as Map<String, dynamic>;
      return data['error'] as String?;
    } catch (_) {
      return null;
    }
  }
}
