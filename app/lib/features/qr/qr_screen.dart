import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../core/qr_repository.dart';

class QrScreen extends StatefulWidget {
  const QrScreen({super.key, required this.repository, required this.accessToken});

  final QrRepository repository;
  final String accessToken;

  @override
  State<QrScreen> createState() => _QrScreenState();
}

class _QrScreenState extends State<QrScreen> {
  final _busquedaController = TextEditingController();

  List<EstudianteResumen> _resultados = [];
  EstudianteResumen? _seleccionado;
  QrInfo? _qr;
  Uint8List? _imagenQr;

  bool _buscando = false;
  bool _cargandoQr = false;
  bool _emitiendo = false;
  String? _error;

  Future<void> _buscar() async {
    final texto = _busquedaController.text.trim();
    if (texto.isEmpty) return;

    setState(() {
      _buscando = true;
      _error = null;
      _seleccionado = null;
      _qr = null;
      _imagenQr = null;
    });

    try {
      final resultados = await widget.repository.buscarEstudiantes(
        busqueda: texto,
        accessToken: widget.accessToken,
      );
      setState(() => _resultados = resultados);
    } on QrException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _buscando = false);
    }
  }

  Future<void> _seleccionar(EstudianteResumen estudiante) async {
    setState(() {
      _seleccionado = estudiante;
      _qr = null;
      _imagenQr = null;
      _error = null;
      _cargandoQr = true;
    });

    try {
      final qr = await widget.repository.obtenerQr(
        estudianteId: estudiante.id,
        accessToken: widget.accessToken,
      );
      setState(() => _qr = qr);
      if (qr != null) await _cargarImagen(estudiante.id);
    } on QrException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _cargandoQr = false);
    }
  }

  Future<void> _cargarImagen(String estudianteId) async {
    try {
      final bytes = await widget.repository.obtenerImagenQr(
        estudianteId: estudianteId,
        accessToken: widget.accessToken,
      );
      setState(() => _imagenQr = Uint8List.fromList(bytes));
    } on QrException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _emitir({required bool reemitir}) async {
    final estudiante = _seleccionado;
    if (estudiante == null) return;

    setState(() {
      _emitiendo = true;
      _error = null;
    });

    try {
      final qr = reemitir
          ? await widget.repository.reemitirQr(estudianteId: estudiante.id, accessToken: widget.accessToken)
          : await widget.repository.generarQr(estudianteId: estudiante.id, accessToken: widget.accessToken);
      setState(() => _qr = qr);
      await _cargarImagen(estudiante.id);
    } on QrException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _emitiendo = false);
    }
  }

  @override
  void dispose() {
    _busquedaController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Carnet QR de estudiante')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _busquedaController,
                    decoration: const InputDecoration(labelText: 'Nombre, apellido o ID PAE'),
                    onSubmitted: (_) => _buscar(),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _buscando ? null : _buscar,
                  child: _buscando
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Buscar'),
                ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 12),
            if (_seleccionado == null)
              Expanded(
                child: ListView.builder(
                  itemCount: _resultados.length,
                  itemBuilder: (context, index) {
                    final estudiante = _resultados[index];
                    return ListTile(
                      title: Text('${estudiante.nombres} ${estudiante.apellidos}'),
                      subtitle: Text(estudiante.idPae),
                      onTap: () => _seleccionar(estudiante),
                    );
                  },
                ),
              )
            else
              Expanded(child: _buildDetalle()),
          ],
        ),
      ),
    );
  }

  Widget _buildDetalle() {
    final estudiante = _seleccionado!;
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextButton.icon(
            icon: const Icon(Icons.arrow_back),
            label: const Text('Volver a la búsqueda'),
            onPressed: () => setState(() => _seleccionado = null),
          ),
          Text('${estudiante.nombres} ${estudiante.apellidos}', style: Theme.of(context).textTheme.titleLarge),
          Text(estudiante.idPae),
          const SizedBox(height: 16),
          if (_cargandoQr)
            const Center(child: CircularProgressIndicator())
          else if (_imagenQr != null) ...[
            Center(child: Image.memory(_imagenQr!, width: 220, height: 220)),
            const SizedBox(height: 8),
            Center(child: Text('Versión del carnet: ${_qr!.versionCarnet} · Estado: ${_qr!.estado}')),
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: const Icon(Icons.refresh),
              label: const Text('Reemitir QR'),
              onPressed: _emitiendo ? null : () => _emitir(reemitir: true),
            ),
          ] else ...[
            const Text('Este estudiante todavía no tiene un QR generado.'),
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: const Icon(Icons.qr_code),
              label: _emitiendo
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Generar QR'),
              onPressed: _emitiendo ? null : () => _emitir(reemitir: false),
            ),
          ],
        ],
      ),
    );
  }
}
