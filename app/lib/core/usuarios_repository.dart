import 'dart:convert';

import 'package:http/http.dart' as http;

import 'app_config.dart';

class UsuariosException implements Exception {
  UsuariosException(this.message);
  final String message;
}

class RolDisponible {
  RolDisponible({required this.id, required this.nombre, this.descripcion});

  factory RolDisponible.fromJson(Map<String, dynamic> json) => RolDisponible(
        id: json['id'] as int,
        nombre: json['nombre'] as String,
        descripcion: json['descripcion'] as String?,
      );

  final int id;
  final String nombre;
  final String? descripcion;
}

/// Alta de usuarios (maestro/submaestro con permiso `usuarios.crear`).
class UsuariosRepository {
  UsuariosRepository({String? baseUrl, http.Client? httpClient})
      : baseUrl = baseUrl ?? AppConfig.apiBaseUrl,
        _httpClient = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _httpClient;

  Future<List<RolDisponible>> listarRoles({required String accessToken}) async {
    final http.Response res;
    try {
      res = await _httpClient.get(
        Uri.parse('$baseUrl/roles'),
        headers: {'Authorization': 'Bearer $accessToken'},
      );
    } catch (_) {
      throw UsuariosException('No se pudo conectar con el servidor.');
    }

    if (res.statusCode != 200) {
      throw UsuariosException(_extraerError(res.body) ?? 'No se pudieron cargar los roles.');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return (data['roles'] as List)
        .map((e) => RolDisponible.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> crearUsuario({
    required String nombreCompleto,
    String? documento,
    required String usuarioLogin,
    required String password,
    required int rolId,
    required String accessToken,
  }) async {
    final http.Response res;
    try {
      res = await _httpClient.post(
        Uri.parse('$baseUrl/usuarios'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
        },
        body: jsonEncode({
          'nombreCompleto': nombreCompleto,
          if (documento != null && documento.isNotEmpty) 'documento': documento,
          'usuarioLogin': usuarioLogin,
          'password': password,
          'rolId': rolId,
        }),
      );
    } catch (_) {
      throw UsuariosException('No se pudo conectar con el servidor.');
    }

    if (res.statusCode != 201) {
      throw UsuariosException(_extraerError(res.body) ?? 'No se pudo crear el usuario.');
    }
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
