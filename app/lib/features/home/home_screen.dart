import 'package:flutter/material.dart';

import '../../core/auth_repository.dart';
import '../../core/offline/asistencia_offline_repository.dart';
import '../../core/offline/dispositivo_repository.dart';
import '../../core/offline/sincronizacion_service.dart';
import '../../core/session.dart';
import '../../core/usuarios_repository.dart';
import '../asistencia/asistencia_screen.dart';
import '../usuarios/crear_usuario_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.sesion,
    required this.authRepository,
    required this.asistenciaOfflineRepository,
    required this.dispositivoRepository,
    required this.sincronizacionService,
    required this.usuariosRepository,
    required this.onLogout,
  });

  final Sesion sesion;
  final AuthRepository authRepository;
  final AsistenciaOfflineRepository asistenciaOfflineRepository;
  final DispositivoRepository dispositivoRepository;
  final SincronizacionService sincronizacionService;
  final UsuariosRepository usuariosRepository;
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
            const SizedBox(height: 24),
            FilledButton.icon(
              icon: const Icon(Icons.fact_check_outlined),
              label: const Text('Tomar asistencia'),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => AsistenciaScreen(
                      sesion: sesion,
                      repository: asistenciaOfflineRepository,
                      dispositivoRepository: dispositivoRepository,
                      sincronizacionService: sincronizacionService,
                    ),
                  ),
                );
              },
            ),
            if (sesion.usuario.permisos.contains('usuarios.crear')) ...[
              const SizedBox(height: 12),
              FilledButton.icon(
                icon: const Icon(Icons.person_add_alt_1_outlined),
                label: const Text('Crear usuario'),
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => CrearUsuarioScreen(
                        repository: usuariosRepository,
                        accessToken: sesion.accessToken,
                      ),
                    ),
                  );
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}
