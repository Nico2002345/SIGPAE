import 'dart:convert';

import 'package:http/http.dart' as http;

import 'app_config.dart';

class QrException implements Exception {
  QrException(this.message);
  final String message;
}

class EstudianteResumen {
  EstudianteResumen({
    required this.id,
    required this.idPae,
    required this.nombres,
    required this.apellidos,
  });

  factory EstudianteResumen.fromJson(Map<String, dynamic> json) => EstudianteResumen(
        id: json['id'] as String,
        idPae: json['idPae'] as String,
        nombres: json['nombres'] as String,
        apellidos: json['apellidos'] as String,
      );

  final String id;
  final String idPae;
  final String nombres;
  final String apellidos;
}

class QrInfo {
  QrInfo({required this.id, required this.estudianteId, required this.versionCarnet, required this.estado});

  factory QrInfo.fromJson(Map<String, dynamic> json) => QrInfo(
        id: json['id'] as int,
        estudianteId: json['estudianteId'] as String,
        versionCarnet: json['versionCarnet'] as int,
        estado: json['estado'] as String,
      );

  final int id;
  final String estudianteId;
  final int versionCarnet;
  final String estado;
}

/// Emisión y consulta de carnets QR de estudiantes (típicamente rol
/// MAESTRO vía permiso `qr.generar`; el escaneo en campo es un flujo
/// aparte, con el permiso `qr.escanear` de OPERADOR/MANIPULADORA).
class QrRepository {
  QrRepository({String? baseUrl, http.Client? httpClient})
      : baseUrl = baseUrl ?? AppConfig.apiBaseUrl,
        _httpClient = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _httpClient;

  Future<List<EstudianteResumen>> buscarEstudiantes({
    required String busqueda,
    required String accessToken,
  }) async {
    final http.Response res;
    try {
      res = await _httpClient.get(
        Uri.parse('$baseUrl/estudiantes').replace(queryParameters: {'busqueda': busqueda}),
        headers: {'Authorization': 'Bearer $accessToken'},
      );
    } catch (_) {
      throw QrException('No se pudo conectar con el servidor.');
    }

    if (res.statusCode != 200) {
      throw QrException(_extraerError(res.body) ?? 'No se pudo buscar estudiantes.');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return (data['estudiantes'] as List)
        .map((e) => EstudianteResumen.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Devuelve null si el estudiante todavía no tiene QR generado.
  Future<QrInfo?> obtenerQr({required String estudianteId, required String accessToken}) async {
    final http.Response res;
    try {
      res = await _httpClient.get(
        Uri.parse('$baseUrl/qr/estudiantes/$estudianteId'),
        headers: {'Authorization': 'Bearer $accessToken'},
      );
    } catch (_) {
      throw QrException('No se pudo conectar con el servidor.');
    }

    if (res.statusCode == 404) return null;
    if (res.statusCode != 200) {
      throw QrException(_extraerError(res.body) ?? 'No se pudo consultar el QR.');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return QrInfo.fromJson(data['qr'] as Map<String, dynamic>);
  }

  Future<QrInfo> generarQr({required String estudianteId, required String accessToken}) =>
      _emitir('$baseUrl/qr/estudiantes/$estudianteId', estudianteId, accessToken);

  Future<QrInfo> reemitirQr({required String estudianteId, required String accessToken}) =>
      _emitir('$baseUrl/qr/estudiantes/$estudianteId/reemitir', estudianteId, accessToken);

  Future<QrInfo> _emitir(String url, String estudianteId, String accessToken) async {
    final http.Response res;
    try {
      res = await _httpClient.post(Uri.parse(url), headers: {'Authorization': 'Bearer $accessToken'});
    } catch (_) {
      throw QrException('No se pudo conectar con el servidor.');
    }

    if (res.statusCode != 201 && res.statusCode != 200) {
      throw QrException(_extraerError(res.body) ?? 'No se pudo emitir el QR.');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return QrInfo.fromJson(data['qr'] as Map<String, dynamic>);
  }

  /// Resuelve un token ya leído de un QR escaneado al estudiante dueño del
  /// carnet (permiso `qr.escanear`: OPERADOR/MANIPULADORA/COORDINADOR_LOGISTICO
  /// en el comedor, antes de registrar la entrega).
  Future<EstudianteResumen> resolverToken({required String token, required String accessToken}) async {
    final http.Response res;
    try {
      res = await _httpClient.get(
        Uri.parse('$baseUrl/qr/resolver').replace(queryParameters: {'token': token}),
        headers: {'Authorization': 'Bearer $accessToken'},
      );
    } catch (_) {
      throw QrException('No se pudo conectar con el servidor.');
    }

    if (res.statusCode != 200) {
      throw QrException(_extraerError(res.body) ?? 'QR inválido o no reconocido.');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return EstudianteResumen.fromJson(data['estudiante'] as Map<String, dynamic>);
  }

  /// Imagen del carnet como PNG (bytes), lista para mostrar con Image.memory.
  Future<List<int>> obtenerImagenQr({required String estudianteId, required String accessToken}) async {
    final http.Response res;
    try {
      res = await _httpClient.get(
        Uri.parse('$baseUrl/qr/estudiantes/$estudianteId/imagen'),
        headers: {'Authorization': 'Bearer $accessToken'},
      );
    } catch (_) {
      throw QrException('No se pudo conectar con el servidor.');
    }

    if (res.statusCode != 200) {
      throw QrException(_extraerError(res.body) ?? 'No se pudo cargar la imagen del QR.');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final dataUrl = data['imagenDataUrl'] as String;
    final base64Data = dataUrl.substring(dataUrl.indexOf(',') + 1);
    return base64Decode(base64Data);
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
