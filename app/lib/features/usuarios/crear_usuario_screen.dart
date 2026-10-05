import 'package:flutter/material.dart';

import '../../core/usuarios_repository.dart';

class CrearUsuarioScreen extends StatefulWidget {
  const CrearUsuarioScreen({super.key, required this.repository, required this.accessToken});

  final UsuariosRepository repository;
  final String accessToken;

  @override
  State<CrearUsuarioScreen> createState() => _CrearUsuarioScreenState();
}

class _CrearUsuarioScreenState extends State<CrearUsuarioScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nombreController = TextEditingController();
  final _documentoController = TextEditingController();
  final _usuarioLoginController = TextEditingController();
  final _passwordController = TextEditingController();

  List<RolDisponible> _roles = [];
  int? _rolId;
  bool _cargandoRoles = true;
  bool _guardando = false;
  String? _error;
  String? _mensajeExito;

  @override
  void initState() {
    super.initState();
    _cargarRoles();
  }

  Future<void> _cargarRoles() async {
    try {
      final roles = await widget.repository.listarRoles(accessToken: widget.accessToken);
      setState(() {
        _roles = roles;
        _rolId = roles.isNotEmpty ? roles.first.id : null;
      });
    } on UsuariosException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _cargandoRoles = false);
    }
  }

  Future<void> _crearUsuario() async {
    if (!_formKey.currentState!.validate() || _rolId == null) return;

    setState(() {
      _guardando = true;
      _error = null;
      _mensajeExito = null;
    });

    try {
      await widget.repository.crearUsuario(
        nombreCompleto: _nombreController.text.trim(),
        documento: _documentoController.text.trim(),
        usuarioLogin: _usuarioLoginController.text.trim(),
        password: _passwordController.text,
        rolId: _rolId!,
        accessToken: widget.accessToken,
      );
      setState(() => _mensajeExito = 'Usuario "${_usuarioLoginController.text.trim()}" creado correctamente.');
      _nombreController.clear();
      _documentoController.clear();
      _usuarioLoginController.clear();
      _passwordController.clear();
    } on UsuariosException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  @override
  void dispose() {
    _nombreController.dispose();
    _documentoController.dispose();
    _usuarioLoginController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Crear usuario')),
      body: _cargandoRoles
          ? const Center(child: CircularProgressIndicator())
          : Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextFormField(
                          controller: _nombreController,
                          decoration: const InputDecoration(labelText: 'Nombre completo'),
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _documentoController,
                          decoration: const InputDecoration(labelText: 'Documento (opcional)'),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _usuarioLoginController,
                          decoration: const InputDecoration(labelText: 'Usuario de acceso'),
                          validator: (v) =>
                              (v == null || v.trim().length < 3) ? 'Mínimo 3 caracteres' : null,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _passwordController,
                          decoration: const InputDecoration(labelText: 'Contraseña inicial'),
                          obscureText: true,
                          validator: (v) =>
                              (v == null || v.length < 8) ? 'Mínimo 8 caracteres' : null,
                        ),
                        const SizedBox(height: 16),
                        DropdownButtonFormField<int>(
                          initialValue: _rolId,
                          decoration: const InputDecoration(labelText: 'Rol'),
                          items: _roles
                              .map((r) => DropdownMenuItem(value: r.id, child: Text(r.nombre)))
                              .toList(),
                          onChanged: (v) => setState(() => _rolId = v),
                          validator: (v) => v == null ? 'Selecciona un rol' : null,
                        ),
                        const SizedBox(height: 24),
                        if (_error != null) ...[
                          Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                          const SizedBox(height: 12),
                        ],
                        if (_mensajeExito != null) ...[
                          Text(_mensajeExito!, style: const TextStyle(color: Colors.green)),
                          const SizedBox(height: 12),
                        ],
                        FilledButton(
                          onPressed: _guardando ? null : _crearUsuario,
                          child: _guardando
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Text('Crear usuario'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}
