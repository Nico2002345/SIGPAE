import 'package:flutter/material.dart';

import '../../core/offline/asistencia_offline_repository.dart';
import '../../core/offline/local_database.dart';
import '../../core/session.dart';

/// Pantalla de asistencia offline-first para docentes (Fase 11 / regla 20).
///
/// Nota: todavía no existe en el backend la asignación docente→sede
/// (AsignacionDocente, ver memoria de fases pendientes), así que por ahora
/// el docente escribe manualmente el id de su sede. Cuando esa asignación
/// exista, este campo se reemplaza por una lista de sedes autorizadas.
class AsistenciaScreen extends StatefulWidget {
  const AsistenciaScreen({super.key, required this.sesion, required this.repository});

  final Sesion sesion;
  final AsistenciaOfflineRepository repository;

  @override
  State<AsistenciaScreen> createState() => _AsistenciaScreenState();
}

class _AsistenciaScreenState extends State<AsistenciaScreen> {
  final _sedeIdController = TextEditingController();
  int? _sedeId;
  JornadasCacheData? _jornada;
  String? _mensajeConexion;
  bool _cargando = false;

  @override
  void dispose() {
    _sedeIdController.dispose();
    super.dispose();
  }

  Future<void> _cargarSede() async {
    final sedeId = int.tryParse(_sedeIdController.text.trim());
    if (sedeId == null) return;

    setState(() {
      _cargando = true;
      _mensajeConexion = null;
    });

    try {
      await widget.repository.sincronizarDatosDeReferencia(
        sedeId: sedeId,
        accessToken: widget.sesion.accessToken,
      );
    } on OfflineException catch (e) {
      setState(() => _mensajeConexion = '${e.message} Mostrando la última copia guardada en este dispositivo.');
    }

    final jornada = await widget.repository.jornadaAbiertaDeSede(sedeId);
    setState(() {
      _sedeId = sedeId;
      _jornada = jornada;
      _cargando = false;
    });
  }

  Future<void> _marcar(String estudianteId, String estado) async {
    final jornada = _jornada;
    if (jornada == null) return;
    await widget.repository.registrarAsistenciaLocal(
      estudianteId: estudianteId,
      jornadaId: jornada.id,
      estado: estado,
    );
  }

  @override
  Widget build(BuildContext context) {
    final sedeId = _sedeId;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Asistencia'),
        actions: [
          if (sedeId != null)
            StreamBuilder<int>(
              stream: widget.repository.observarPendientesDeSincronizar(),
              builder: (context, snapshot) {
                final pendientes = snapshot.data ?? 0;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Center(
                    child: Chip(
                      label: Text(pendientes == 0 ? 'Sincronizado' : '$pendientes sin sincronizar'),
                      backgroundColor: pendientes == 0 ? Colors.green.shade100 : Colors.orange.shade100,
                    ),
                  ),
                );
              },
            ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _sedeIdController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'ID de sede'),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _cargando ? null : _cargarSede,
                  child: const Text('Cargar'),
                ),
              ],
            ),
            if (_mensajeConexion != null) ...[
              const SizedBox(height: 8),
              Text(_mensajeConexion!, style: TextStyle(color: Colors.orange.shade800)),
            ],
            const SizedBox(height: 16),
            if (_cargando) const LinearProgressIndicator(),
            if (sedeId != null && _jornada == null && !_cargando)
              const Text('No hay una jornada abierta para esta sede.'),
            if (sedeId != null && _jornada != null)
              Expanded(
                child: StreamBuilder<List<EstudiantesCacheData>>(
                  stream: widget.repository.observarEstudiantesDeSede(sedeId),
                  builder: (context, estudiantesSnapshot) {
                    final estudiantes = estudiantesSnapshot.data ?? const [];
                    if (estudiantes.isEmpty) {
                      return const Center(child: Text('Sin estudiantes guardados localmente para esta sede.'));
                    }
                    return StreamBuilder<List<AsistenciasLocale>>(
                      stream: widget.repository.observarAsistenciasDeJornada(_jornada!.id),
                      builder: (context, asistenciasSnapshot) {
                        final asistencias = {
                          for (final a in asistenciasSnapshot.data ?? const <AsistenciasLocale>[])
                            a.estudianteId: a.estado,
                        };
                        return ListView.separated(
                          itemCount: estudiantes.length,
                          separatorBuilder: (_, _) => const Divider(height: 1),
                          itemBuilder: (context, index) {
                            final estudiante = estudiantes[index];
                            final estadoActual = asistencias[estudiante.id];
                            return ListTile(
                              title: Text('${estudiante.nombres} ${estudiante.apellidos}'),
                              subtitle: Text(estudiante.idPae),
                              trailing: SegmentedButton<String>(
                                segments: const [
                                  ButtonSegment(value: 'ASISTIO', label: Text('Asistió')),
                                  ButtonSegment(value: 'NO_ASISTIO', label: Text('No asistió')),
                                ],
                                selected: {?estadoActual},
                                emptySelectionAllowed: true,
                                onSelectionChanged: (seleccion) {
                                  if (seleccion.isNotEmpty) {
                                    _marcar(estudiante.id, seleccion.first);
                                  }
                                },
                              ),
                            );
                          },
                        );
                      },
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
