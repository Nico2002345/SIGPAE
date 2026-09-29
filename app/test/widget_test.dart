import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sigpae_app/core/auth_repository.dart';
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

void main() {
  testWidgets('Muestra el formulario de login cuando no hay sesión guardada', (tester) async {
    final authRepository = AuthRepository(storage: InMemoryTokenStorage());

    await tester.pumpWidget(SigpaeApp(authRepository: authRepository));
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

    await tester.pumpWidget(SigpaeApp(authRepository: authRepository));
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

    await tester.pumpWidget(SigpaeApp(authRepository: authRepository));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextFormField, 'Usuario'), 'maestro');
    await tester.enterText(find.widgetWithText(TextFormField, 'Contraseña'), 'incorrecta');
    await tester.tap(find.text('Ingresar'));
    await tester.pumpAndSettle();

    expect(find.text('Usuario o contraseña incorrectos'), findsOneWidget);
  });
}
