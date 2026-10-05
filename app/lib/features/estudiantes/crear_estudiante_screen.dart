import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../core/estudiantes_repository.dart';
import '../../core/qr_repository.dart';
import '../../core/session.dart';

final _idPaeRegex = RegExp(r'^PAE-\d{4}-\d{6}$');

class CrearEstudianteScreen extends StatefulWidget {
  const CrearEstudianteScreen({
    super.key,
    required this.repository,
    required this.qrRepository,
    required this.sesion,
  });

  final EstudiantesRepository repository;
  final QrRepository qrRepository;
  final Sesion sesion;

  @override
  State<CrearEstudianteScreen> createState() => _CrearEstudianteScreenState();
}

class _CrearEstudianteScreenState extends State<CrearEstudianteScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nombresController = TextEditingController();
  final _apellidosController = TextEditingController();
  final _sedeIdController = TextEditingController();
  final _institucionIdController = TextEditingController();
  final _idPaeController = TextEditingController();
  final _documentoTipoController = TextEditingController();
  final _documentoNumeroController = TextEditingController();
  DateTime? _fechaNacimiento;
  String? _genero;

  late bool _esOficial;

  bool _guardando = false;
  String? _error;
  EstudianteCreado? _ultimoCreado;
  Uint8List? _qrDelUltimo;
  bool _generandoQr = false;

  bool get _puedeGenerarQr => widget.sesion.usuario.permisos.contains('qr.generar');
  bool get _puedeOficial => widget.sesion.usuario.permisos.contains('estudiantes.crear');
  bool get _puedeProvisional => widget.sesion.usuario.permisos.contains('estudiantes.crear_provisional');

  @override
  void initState() {
    super.initState();
    // Si solo tiene uno de los dos permisos, el modo queda fijo en ese.
    _esOficial = _puedeOficial && !_puedeProvisional;
  }

  Future<void> _elegirFecha() async {
    final hoy = DateTime.now();
    final seleccionada = await showDatePicker(
      context: context,
      initialDate: DateTime(hoy.year - 7),
      firstDate: DateTime(hoy.year - 20),
      lastDate: hoy,
    );
    if (seleccionada != null) setState(() => _fechaNacimiento = seleccionada);
  }

  Future<void> _registrar() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _guardando = true;
      _error = null;
      _ultimoCreado = null;
      _qrDelUltimo = null;
    });

    try {
      final creado = _esOficial
          ? await widget.repository.crearOficial(
              idPae: _idPaeController.text.trim(),
              nombres: _nombresController.text.trim(),
              apellidos: _apellidosController.text.trim(),
              sedeId: int.parse(_sedeIdController.text.trim()),
              institucionId: int.parse(_institucionIdController.text.trim()),
              documentoTipo:
                  _documentoTipoController.text.trim().isEmpty ? null : _documentoTipoController.text.trim(),
              documentoNumero:
                  _documentoNumeroController.text.trim().isEmpty ? null : _documentoNumeroController.text.trim(),
              fechaNacimiento: _fechaNacimiento,
              genero: _genero,
              accessToken: widget.sesion.accessToken,
            )
          : await widget.repository.crearProvisional(
              nombres: _nombresController.text.trim(),
              apellidos: _apellidosController.text.trim(),
              sedeId: int.parse(_sedeIdController.text.trim()),
              institucionId: int.parse(_institucionIdController.text.trim()),
              fechaNacimiento: _fechaNacimiento,
              genero: _genero,
              accessToken: widget.sesion.accessToken,
            );
      setState(() => _ultimoCreado = creado);

      if (_puedeGenerarQr) {
        setState(() => _generandoQr = true);
        try {
          await widget.qrRepository.generarQr(estudianteId: creado.id, accessToken: widget.sesion.accessToken);
          final bytes = await widget.qrRepository.obtenerImagenQr(
            estudianteId: creado.id,
            accessToken: widget.sesion.accessToken,
          );
          setState(() => _qrDelUltimo = Uint8List.fromList(bytes));
        } on QrException {
          // El estudiante quedó registrado igual; el carnet se puede generar
          // después desde "Carnet QR de estudiante".
        } finally {
          if (mounted) setState(() => _generandoQr = false);
        }
      }

      _nombresController.clear();
      _apellidosController.clear();
      _idPaeController.clear();
      _documentoTipoController.clear();
      _documentoNumeroController.clear();
      setState(() => _fechaNacimiento = null);
      setState(() => _genero = null);
    } on EstudiantesException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  @override
  void dispose() {
    _nombresController.dispose();
    _apellidosController.dispose();
    _sedeIdController.dispose();
    _institucionIdController.dispose();
    _idPaeController.dispose();
    _documentoTipoController.dispose();
    _documentoNumeroController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Registrar estudiante')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_puedeOficial && _puedeProvisional) ...[
                    SegmentedButton<bool>(
                      segments: const [
                        ButtonSegment(value: false, label: Text('Provisional')),
                        ButtonSegment(value: true, label: Text('Oficial (SIMAT)')),
                      ],
                      selected: {_esOficial},
                      onSelectionChanged: (s) => setState(() => _esOficial = s.first),
                    ),
                    const SizedBox(height: 12),
                  ],
                  Text(
                    _esOficial
                        ? 'Para un estudiante que ya tiene un id_pae oficial conocido (ej. de un carné anterior).'
                        : 'Para estudiantes que todavía no aparecen en SIMAT. '
                            'Quedan con un ID temporal hasta la próxima importación.',
                    style: const TextStyle(color: Colors.black54),
                  ),
                  const SizedBox(height: 16),
                  if (_esOficial) ...[
                    TextFormField(
                      controller: _idPaeController,
                      decoration: const InputDecoration(labelText: 'ID PAE', hintText: 'PAE-2026-000123'),
                      validator: (v) => _idPaeRegex.hasMatch(v?.trim() ?? '')
                          ? null
                          : 'Formato: PAE-AAAA-NNNNNN',
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextFormField(
                    controller: _nombresController,
                    decoration: const InputDecoration(labelText: 'Nombres'),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _apellidosController,
                    decoration: const InputDecoration(labelText: 'Apellidos'),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _sedeIdController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'ID de sede'),
                          validator: (v) => (int.tryParse(v?.trim() ?? '') == null) ? 'Requerido' : null,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _institucionIdController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'ID de institución'),
                          validator: (v) => (int.tryParse(v?.trim() ?? '') == null) ? 'Requerido' : null,
                        ),
                      ),
                    ],
                  ),
                  if (_esOficial) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _documentoTipoController,
                            decoration: const InputDecoration(labelText: 'Documento tipo (opcional)'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _documentoNumeroController,
                            decoration: const InputDecoration(labelText: 'Documento número (opcional)'),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _elegirFecha,
                          child: Text(
                            _fechaNacimiento == null
                                ? 'Fecha de nacimiento (opcional)'
                                : '${_fechaNacimiento!.year}-${_fechaNacimiento!.month.toString().padLeft(2, '0')}-${_fechaNacimiento!.day.toString().padLeft(2, '0')}',
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _genero,
                    decoration: const InputDecoration(labelText: 'Género (opcional)'),
                    items: const [
                      DropdownMenuItem(value: 'MASCULINO', child: Text('Masculino')),
                      DropdownMenuItem(value: 'FEMENINO', child: Text('Femenino')),
                    ],
                    onChanged: (v) => setState(() => _genero = v),
                  ),
                  const SizedBox(height: 20),
                  if (_error != null) ...[
                    Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    const SizedBox(height: 12),
                  ],
                  FilledButton(
                    onPressed: _guardando ? null : _registrar,
                    child: _guardando
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Registrar y seguir con el siguiente'),
                  ),
                  if (_ultimoCreado != null) ...[
                    const SizedBox(height: 24),
                    const Divider(),
                    const SizedBox(height: 8),
                    Text(
                      '✓ ${_ultimoCreado!.nombres} ${_ultimoCreado!.apellidos}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text('ID: ${_ultimoCreado!.idPae}'),
                    const SizedBox(height: 12),
                    if (_generandoQr)
                      const Center(child: CircularProgressIndicator())
                    else if (_qrDelUltimo != null)
                      Center(child: Image.memory(_qrDelUltimo!, width: 180, height: 180))
                    else if (!_puedeGenerarQr)
                      const Text(
                        'Pídele a alguien con permiso de generar QR que emita su carnet.',
                        style: TextStyle(color: Colors.black54),
                      ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
