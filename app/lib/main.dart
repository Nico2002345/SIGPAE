import 'package:flutter/material.dart';

import 'core/auth_repository.dart';
import 'core/entregas_repository.dart';
import 'core/offline/asistencia_offline_repository.dart';
import 'core/offline/dispositivo_repository.dart';
import 'core/offline/local_database.dart';
import 'core/offline/sincronizacion_service.dart';
import 'core/qr_repository.dart';
import 'core/session.dart';
import 'core/usuarios_repository.dart';
import 'features/auth/login_screen.dart';
import 'features/home/home_screen.dart';

void main() {
  final localDatabase = LocalDatabase();
  runApp(SigpaeApp(
    authRepository: AuthRepository(),
    asistenciaOfflineRepository: AsistenciaOfflineRepository(db: localDatabase),
    dispositivoRepository: DispositivoRepository(),
    sincronizacionService: SincronizacionService(db: localDatabase),
    usuariosRepository: UsuariosRepository(),
    qrRepository: QrRepository(),
    entregasRepository: EntregasRepository(),
  ));
}

class SigpaeApp extends StatelessWidget {
  SigpaeApp({
    super.key,
    AuthRepository? authRepository,
    AsistenciaOfflineRepository? asistenciaOfflineRepository,
    DispositivoRepository? dispositivoRepository,
    SincronizacionService? sincronizacionService,
    UsuariosRepository? usuariosRepository,
    QrRepository? qrRepository,
    EntregasRepository? entregasRepository,
  })  : authRepository = authRepository ?? AuthRepository(),
        asistenciaOfflineRepository =
            asistenciaOfflineRepository ?? AsistenciaOfflineRepository(db: LocalDatabase()),
        dispositivoRepository = dispositivoRepository ?? DispositivoRepository(),
        sincronizacionService = sincronizacionService ?? SincronizacionService(db: LocalDatabase()),
        usuariosRepository = usuariosRepository ?? UsuariosRepository(),
        qrRepository = qrRepository ?? QrRepository(),
        entregasRepository = entregasRepository ?? EntregasRepository();

  final AuthRepository authRepository;
  final AsistenciaOfflineRepository asistenciaOfflineRepository;
  final DispositivoRepository dispositivoRepository;
  final SincronizacionService sincronizacionService;
  final UsuariosRepository usuariosRepository;
  final QrRepository qrRepository;
  final EntregasRepository entregasRepository;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SIGPAE',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal)),
      home: RaizAutenticacion(
        authRepository: authRepository,
        asistenciaOfflineRepository: asistenciaOfflineRepository,
        dispositivoRepository: dispositivoRepository,
        sincronizacionService: sincronizacionService,
        usuariosRepository: usuariosRepository,
        qrRepository: qrRepository,
        entregasRepository: entregasRepository,
      ),
    );
  }
}

class RaizAutenticacion extends StatefulWidget {
  const RaizAutenticacion({
    super.key,
    required this.authRepository,
    required this.asistenciaOfflineRepository,
    required this.dispositivoRepository,
    required this.sincronizacionService,
    required this.usuariosRepository,
    required this.qrRepository,
    required this.entregasRepository,
  });

  final AuthRepository authRepository;
  final AsistenciaOfflineRepository asistenciaOfflineRepository;
  final DispositivoRepository dispositivoRepository;
  final SincronizacionService sincronizacionService;
  final UsuariosRepository usuariosRepository;
  final QrRepository qrRepository;
  final EntregasRepository entregasRepository;

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
      dispositivoRepository: widget.dispositivoRepository,
      sincronizacionService: widget.sincronizacionService,
      usuariosRepository: widget.usuariosRepository,
      qrRepository: widget.qrRepository,
      entregasRepository: widget.entregasRepository,
      onLogout: () => setState(() => _sesion = null),
    );
  }
}
