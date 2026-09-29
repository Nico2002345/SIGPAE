import 'package:flutter/material.dart';

import '../../core/auth_repository.dart';
import '../../core/session.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.sesion,
    required this.authRepository,
    required this.onLogout,
  });

  final Sesion sesion;
  final AuthRepository authRepository;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SIGPAE'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesión',
            onPressed: () async {
              await authRepository.logout();
              onLogout();
            },
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Bienvenido, ${sesion.usuario.nombreCompleto}', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text('Rol: ${sesion.usuario.rol}'),
          ],
        ),
      ),
    );
  }
}
