import 'package:flutter/material.dart';

import 'core/auth_repository.dart';
import 'core/offline/asistencia_offline_repository.dart';
import 'core/offline/local_database.dart';
import 'core/session.dart';
import 'features/auth/login_screen.dart';
import 'features/home/home_screen.dart';

void main() {
  final localDatabase = LocalDatabase();
  runApp(SigpaeApp(
    authRepository: AuthRepository(),
    asistenciaOfflineRepository: AsistenciaOfflineRepository(db: localDatabase),
  ));
}

class SigpaeApp extends StatelessWidget {
  SigpaeApp({super.key, AuthRepository? authRepository, AsistenciaOfflineRepository? asistenciaOfflineRepository})
      : authRepository = authRepository ?? AuthRepository(),
        asistenciaOfflineRepository =
            asistenciaOfflineRepository ?? AsistenciaOfflineRepository(db: LocalDatabase());

  final AuthRepository authRepository;
  final AsistenciaOfflineRepository asistenciaOfflineRepository;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SIGPAE',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal)),
      home: RaizAutenticacion(
        authRepository: authRepository,
        asistenciaOfflineRepository: asistenciaOfflineRepository,
      ),
    );
  }
}

class RaizAutenticacion extends StatefulWidget {
  const RaizAutenticacion({super.key, required this.authRepository, required this.asistenciaOfflineRepository});

  final AuthRepository authRepository;
  final AsistenciaOfflineRepository asistenciaOfflineRepository;

  @override
  State<RaizAutenticacion> createState() => _RaizAutenticacionState();
}

class _RaizAutenticacionState extends State<RaizAutenticacion> {
  Sesion? _sesion;
  bool _cargandoSesionGuardada = true;

  @override
  void initState() {
    super.initState();
    _cargarSesionGuardada();
  }

  Future<void> _cargarSesionGuardada() async {
    final sesion = await widget.authRepository.sesionGuardada();
    if (!mounted) return;
    setState(() {
      _sesion = sesion;
      _cargandoSesionGuardada = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_cargandoSesionGuardada) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_sesion == null) {
      return LoginScreen(
        authRepository: widget.authRepository,
        onLoginExitoso: (sesion) => setState(() => _sesion = sesion),
      );
    }

    return HomeScreen(
      sesion: _sesion!,
      authRepository: widget.authRepository,
      asistenciaOfflineRepository: widget.asistenciaOfflineRepository,
      onLogout: () => setState(() => _sesion = null),
    );
  }
}
