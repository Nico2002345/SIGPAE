import 'dart:convert';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sigpae_app/core/auth_repository.dart';
import 'package:sigpae_app/core/offline/asistencia_offline_repository.dart';
import 'package:sigpae_app/core/offline/local_database.dart';
import 'package:sigpae_app/core/token_storage.dart';
import 'package:sigpae_app/main.dart';

class InMemoryTokenStorage implements TokenStorage {
  final Map<String, String> _valores = {};

  @override
  Future<void> delete(String key) async => _valores.remove(key);

  @override
  Future<String?> read(String key) async => _valores[key];

  @override
  Future<void> write(String key, String value) async => _valores[key] = value;
}

// Cada test necesita su propia base de datos local en memoria: usar la
// misma instancia (o el fallback que abre un archivo real en disco) entre
// pumpWidget de distintos tests dispara la advertencia de drift sobre
// múltiples conexiones al mismo archivo y podría filtrar estado entre tests.
AsistenciaOfflineRepository _repositorioOfflineDePrueba() =>
    AsistenciaOfflineRepository(db: LocalDatabase.forTesting(NativeDatabase.memory()));

void main() {
  // Cada test crea su propia base local en memoria a propósito (ver
  // _repositorioOfflineDePrueba); la advertencia de drift sobre "múltiples
  // bases de datos" asume que eso es un error, pero aquí es intencional.
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;

  testWidgets('Muestra el formulario de login cuando no hay sesión guardada', (tester) async {
    final authRepository = AuthRepository(storage: InMemoryTokenStorage());

    await tester.pumpWidget(SigpaeApp(authRepository: authRepository, asistenciaOfflineRepository: _repositorioOfflineDePrueba()));
    await tester.pumpAndSettle();

    expect(find.text('SIGPAE — Iniciar sesión'), findsOneWidget);
  });

  testWidgets('Inicia sesión con el backend y muestra la pantalla principal', (tester) async {
    final mockClient = MockClient((request) async {
      if (request.url.path == '/auth/login') {
        return http.Response(
          jsonEncode({
            'accessToken': 'token-acceso',
            'refreshToken': 'token-refresco',
            'usuario': {
              'id': '1',
              'nombreCompleto': 'Administrador Maestro',
              'rol': 'MAESTRO',
              'permisos': ['usuarios.ver'],
            },
          }),
          200,
        );
      }
      return http.Response('No encontrado', 404);
    });

    final authRepository = AuthRepository(
      storage: InMemoryTokenStorage(),
      httpClient: mockClient,
    );

    await tester.pumpWidget(SigpaeApp(authRepository: authRepository, asistenciaOfflineRepository: _repositorioOfflineDePrueba()));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextFormField, 'Usuario'), 'maestro');
    await tester.enterText(find.widgetWithText(TextFormField, 'Contraseña'), 'clave-segura');
    await tester.tap(find.text('Ingresar'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Administrador Maestro'), findsOneWidget);
    expect(find.text('Rol: MAESTRO'), findsOneWidget);
  });

  testWidgets('Muestra el error cuando las credenciales son incorrectas', (tester) async {
    final mockClient = MockClient((request) async {
      return http.Response(jsonEncode({'error': 'Usuario o contraseña incorrectos'}), 401);
    });

    final authRepository = AuthRepository(
      storage: InMemoryTokenStorage(),
      httpClient: mockClient,
    );

    await tester.pumpWidget(SigpaeApp(authRepository: authRepository, asistenciaOfflineRepository: _repositorioOfflineDePrueba()));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextFormField, 'Usuario'), 'maestro');
    await tester.enterText(find.widgetWithText(TextFormField, 'Contraseña'), 'incorrecta');
    await tester.tap(find.text('Ingresar'));
    await tester.pumpAndSettle();

    expect(find.text('Usuario o contraseña incorrectos'), findsOneWidget);
  });
}
