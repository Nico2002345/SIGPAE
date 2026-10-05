import 'dart:convert';

import 'package:http/http.dart' as http;

import 'app_config.dart';

class EstudiantesException implements Exception {
  EstudiantesException(this.message);
  final String message;
}

class EstudianteCreado {
  EstudianteCreado({required this.id, required this.idPae, required this.nombres, required this.apellidos});

  factory EstudianteCreado.fromJson(Map<String, dynamic> json) => EstudianteCreado(
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

/// Alta rápida de estudiantes que todavía no aparecen en SIMAT (permiso
/// `estudiantes.crear_provisional`, típicamente DOCENTE). Quedan con
/// idPae `TEMP-AAAA-NNNNNN` hasta que una importación SIMAT los vincule
/// con su registro oficial.
class EstudiantesRepository {
  EstudiantesRepository({String? baseUrl, http.Client? httpClient})
      : baseUrl = baseUrl ?? AppConfig.apiBaseUrl,
        _httpClient = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _httpClient;

  Future<EstudianteCreado> crearProvisional({
    required String nombres,
    required String apellidos,
    required int sedeId,
    required int institucionId,
    DateTime? fechaNacimiento,
    String? genero,
    required String accessToken,
  }) async {
    final http.Response res;
    try {
      res = await _httpClient.post(
        Uri.parse('$baseUrl/estudiantes/provisionales'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
        },
        body: jsonEncode({
          'nombres': nombres,
          'apellidos': apellidos,
          'sedeId': sedeId,
          'institucionId': institucionId,
          'fechaNacimiento': ?fechaNacimiento?.toIso8601String(),
          'genero': ?genero,
        }),
      );
    } catch (_) {
      throw EstudiantesException('No se pudo conectar con el servidor.');
    }

    if (res.statusCode != 201) {
      throw EstudiantesException(_extraerError(res.body) ?? 'No se pudo registrar el estudiante.');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return EstudianteCreado.fromJson(data['estudiante'] as Map<String, dynamic>);
  }

  /// Alta de un estudiante "normal" (oficial, de SIMAT) cuyo id_pae ya se
  /// conoce de antemano (permiso `estudiantes.crear`). A diferencia del
  /// provisional, el id_pae no se inventa acá: debe venir del registro
  /// oficial (formato PAE-AAAA-NNNNNN), igual que lo asigna la importación
  /// SIMAT.
  Future<EstudianteCreado> crearOficial({
    required String idPae,
    required String nombres,
    required String apellidos,
    required int sedeId,
    required int institucionId,
    String? documentoTipo,
    String? documentoNumero,
    DateTime? fechaNacimiento,
    String? genero,
    required String accessToken,
  }) async {
    final http.Response res;
    try {
      res = await _httpClient.post(
        Uri.parse('$baseUrl/estudiantes'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
        },
        body: jsonEncode({
          'idPae': idPae,
          'nombres': nombres,
          'apellidos': apellidos,
          'sedeId': sedeId,
          'institucionId': institucionId,
          'documentoTipo': ?documentoTipo,
          'documentoNumero': ?documentoNumero,
          'fechaNacimiento': ?fechaNacimiento?.toIso8601String(),
          'genero': ?genero,
        }),
      );
    } catch (_) {
      throw EstudiantesException('No se pudo conectar con el servidor.');
    }

    if (res.statusCode != 201) {
      throw EstudiantesException(_extraerError(res.body) ?? 'No se pudo registrar el estudiante.');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return EstudianteCreado.fromJson(data['estudiante'] as Map<String, dynamic>);
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
