import 'dart:convert';

import 'package:http/http.dart' as http;

import 'app_config.dart';
import 'session.dart';
import 'token_storage.dart';

class AuthException implements Exception {
  AuthException(this.message);
  final String message;
}

class AuthRepository {
  AuthRepository({String? baseUrl, http.Client? httpClient, TokenStorage? storage})
      : baseUrl = baseUrl ?? AppConfig.apiBaseUrl,
        _httpClient = httpClient ?? http.Client(),
        _storage = storage ?? const SecureTokenStorage();

  final String baseUrl;
  final http.Client _httpClient;
  final TokenStorage _storage;

  static const _accessTokenKey = 'sigpae_access_token';
  static const _refreshTokenKey = 'sigpae_refresh_token';
  static const _usuarioKey = 'sigpae_usuario';

  Future<Sesion> login(String usuarioLogin, String password) async {
    final http.Response res;
    try {
      res = await _httpClient.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'usuarioLogin': usuarioLogin, 'password': password}),
      );
    } catch (_) {
      throw AuthException('No se pudo conectar con el servidor.');
    }

    if (res.statusCode != 200) {
      throw AuthException(_extraerError(res.body) ?? 'Usuario o contraseña incorrectos');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final sesion = Sesion(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
      usuario: Usuario.fromJson(data['usuario'] as Map<String, dynamic>),
    );

    await _storage.write(_accessTokenKey, sesion.accessToken);
    await _storage.write(_refreshTokenKey, sesion.refreshToken);
    await _storage.write(_usuarioKey, jsonEncode(data['usuario']));

    return sesion;
  }

  Future<void> logout() async {
    final refreshToken = await _storage.read(_refreshTokenKey);
    if (refreshToken != null) {
      try {
        await _httpClient.post(
          Uri.parse('$baseUrl/auth/logout'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'refreshToken': refreshToken}),
        );
      } catch (_) {
        // Sin conexión: igual se limpia la sesión local.
      }
    }
    await _storage.delete(_accessTokenKey);
    await _storage.delete(_refreshTokenKey);
    await _storage.delete(_usuarioKey);
  }

  Future<Sesion?> sesionGuardada() async {
    final accessToken = await _storage.read(_accessTokenKey);
    final refreshToken = await _storage.read(_refreshTokenKey);
    final usuarioJson = await _storage.read(_usuarioKey);
    if (accessToken == null || refreshToken == null || usuarioJson == null) {
      return null;
    }
    return Sesion(
      accessToken: accessToken,
      refreshToken: refreshToken,
      usuario: Usuario.fromJson(jsonDecode(usuarioJson) as Map<String, dynamic>),
    );
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
