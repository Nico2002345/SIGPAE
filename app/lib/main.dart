import 'package:flutter/material.dart';

import 'core/auth_repository.dart';
import 'core/session.dart';
import 'features/auth/login_screen.dart';
import 'features/home/home_screen.dart';

void main() {
  runApp(SigpaeApp(authRepository: AuthRepository()));
}

class SigpaeApp extends StatelessWidget {
  SigpaeApp({super.key, AuthRepository? authRepository})
      : authRepository = authRepository ?? AuthRepository();

  final AuthRepository authRepository;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SIGPAE',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal)),
      home: RaizAutenticacion(authRepository: authRepository),
    );
  }
}

class RaizAutenticacion extends StatefulWidget {
  const RaizAutenticacion({super.key, required this.authRepository});

  final AuthRepository authRepository;

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
      onLogout: () => setState(() => _sesion = null),
    );
  }
}
