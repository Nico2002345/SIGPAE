import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/entregas_repository.dart';
import '../../core/qr_repository.dart';

class EscanearQrScreen extends StatefulWidget {
  const EscanearQrScreen({
    super.key,
    required this.qrRepository,
    required this.entregasRepository,
    required this.accessToken,
  });

  final QrRepository qrRepository;
  final EntregasRepository entregasRepository;
  final String accessToken;

  @override
  State<EscanearQrScreen> createState() => _EscanearQrScreenState();
}

class _EscanearQrScreenState extends State<EscanearQrScreen> {
  final _sedeIdController = TextEditingController();
  final _controller = MobileScannerController();

  JornadaResumen? _jornada;
  bool _cargandoJornada = false;
  String? _errorJornada;

  bool _procesando = false;
  EstudianteResumen? _estudianteDetectado;
  String? _tokenDetectado;
  String? _errorEscaneo;
  ResultadoEntrega? _ultimoResultado;

  Future<void> _cargarJornada() async {
    final sedeId = int.tryParse(_sedeIdController.text.trim());
    if (sedeId == null) return;

    setState(() {
      _cargandoJornada = true;
      _errorJornada = null;
    });

    try {
      final jornada = await widget.entregasRepository.jornadaActivaDeSede(
        sedeId: sedeId,
        accessToken: widget.accessToken,
      );
      setState(() {
        _jornada = jornada;
        if (jornada == null) {
          _errorJornada = 'Esta sede no tiene una jornada abierta o en entrega ahora mismo.';
        }
      });
    } on EntregasException catch (e) {
      setState(() => _errorJornada = e.message);
    } finally {
      if (mounted) setState(() => _cargandoJornada = false);
    }
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_procesando || _estudianteDetectado != null) return;
    final token = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
    if (token == null || token.isEmpty) return;

    setState(() {
      _procesando = true;
      _errorEscaneo = null;
      _ultimoResultado = null;
    });

    try {
      final estudiante = await widget.qrRepository.resolverToken(token: token, accessToken: widget.accessToken);
      setState(() {
        _estudianteDetectado = estudiante;
        _tokenDetectado = token;
      });
    } on QrException catch (e) {
      setState(() => _errorEscaneo = e.message);
    } finally {
      if (mounted) setState(() => _procesando = false);
    }
  }

  Future<void> _confirmarEntrega() async {
    final token = _tokenDetectado;
    final jornada = _jornada;
    if (token == null || jornada == null) return;

    setState(() => _procesando = true);
    try {
      final resultado = await widget.entregasRepository.registrarEntrega(
        token: token,
        jornadaId: jornada.id,
        accessToken: widget.accessToken,
      );
      setState(() => _ultimoResultado = resultado);
    } on EntregasException catch (e) {
      setState(() => _errorEscaneo = e.message);
    } finally {
      if (mounted) {
        setState(() {
          _procesando = false;
          _estudianteDetectado = null;
          _tokenDetectado = null;
        });
      }
    }
  }

  void _cancelarDeteccion() {
    setState(() {
      _estudianteDetectado = null;
      _tokenDetectado = null;
      _errorEscaneo = null;
    });
  }

  @override
  void dispose() {
    _sedeIdController.dispose();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Escanear QR — Entregas')),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _sedeIdController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'ID de sede'),
                    enabled: _jornada == null,
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: (_cargandoJornada || _jornada != null) ? null : _cargarJornada,
                  child: _cargandoJornada
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Cargar jornada'),
                ),
              ],
            ),
          ),
          if (_errorJornada != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(_errorJornada!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          if (_jornada != null) ...[
            Expanded(
              child: Stack(
                children: [
                  MobileScanner(controller: _controller, onDetect: _onDetect),
                  if (_ultimoResultado != null)
                    _BannerResultado(resultado: _ultimoResultado!, onCerrar: () => setState(() => _ultimoResultado = null)),
                  if (_errorEscaneo != null && _estudianteDetectado == null)
                    _BannerError(mensaje: _errorEscaneo!, onCerrar: () => setState(() => _errorEscaneo = null)),
                  if (_estudianteDetectado != null)
                    _PanelConfirmacion(
                      estudiante: _estudianteDetectado!,
                      procesando: _procesando,
                      onConfirmar: _confirmarEntrega,
                      onCancelar: _cancelarDeteccion,
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PanelConfirmacion extends StatelessWidget {
  const _PanelConfirmacion({
    required this.estudiante,
    required this.procesando,
    required this.onConfirmar,
    required this.onCancelar,
  });

  final EstudianteResumen estudiante;
  final bool procesando;
  final VoidCallback onConfirmar;
  final VoidCallback onCancelar;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.bottomCenter,
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          boxShadow: const [BoxShadow(blurRadius: 8, color: Colors.black26)],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('${estudiante.nombres} ${estudiante.apellidos}', style: Theme.of(context).textTheme.titleMedium),
            Text(estudiante.idPae),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: procesando ? null : onCancelar,
                    child: const Text('Cancelar'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    onPressed: procesando ? null : onConfirmar,
                    child: procesando
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Confirmar entrega'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _BannerResultado extends StatelessWidget {
  const _BannerResultado({required this.resultado, required this.onCerrar});

  final ResultadoEntrega resultado;
  final VoidCallback onCerrar;

  @override
  Widget build(BuildContext context) {
    final color = resultado.autorizada ? Colors.green : Colors.red;
    final texto = resultado.autorizada
        ? 'Entrega autorizada'
        : 'Entrega rechazada: ${resultado.motivoRechazo ?? 'motivo desconocido'}';
    return Align(
      alignment: Alignment.topCenter,
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
        child: Row(
          children: [
            Icon(resultado.autorizada ? Icons.check_circle : Icons.cancel, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(texto, style: const TextStyle(color: Colors.white))),
            IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: onCerrar),
          ],
        ),
      ),
    );
  }
}

class _BannerError extends StatelessWidget {
  const _BannerError({required this.mensaje, required this.onCerrar});

  final String mensaje;
  final VoidCallback onCerrar;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(8)),
        child: Row(
          children: [
            const Icon(Icons.error, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(mensaje, style: const TextStyle(color: Colors.white))),
            IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: onCerrar),
          ],
        ),
      ),
    );
  }
}
