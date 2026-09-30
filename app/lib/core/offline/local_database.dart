import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'local_database.g.dart';

/// Copia local de los estudiantes de una sede (regla 20 del spec: "los
/// datos deben guardarse localmente"). Se llena al sincronizar con
/// conexión y se lee sin conexión; nunca se edita directamente aquí, solo
/// se reemplaza con lo que devuelva el servidor.
class EstudiantesCache extends Table {
  TextColumn get id => text()();
  TextColumn get idPae => text()();
  TextColumn get nombres => text()();
  TextColumn get apellidos => text()();
  IntColumn get sedeId => integer()();
  TextColumn get estado => text()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Copia local de la jornada PAE del día para una sede.
class JornadasCache extends Table {
  TextColumn get id => text()();
  IntColumn get sedeId => integer()();
  DateTimeColumn get fecha => dateTime()();
  TextColumn get estado => text()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Asistencia registrada en el dispositivo. El id se genera localmente
/// (uuid) porque puede crearse sin conexión, igual que en el servidor.
class AsistenciasLocales extends Table {
  TextColumn get id => text()();
  TextColumn get estudianteId => text()();
  TextColumn get jornadaId => text()();
  TextColumn get estado => text()();
  DateTimeColumn get fechaHoraRegistro => dateTime()();
  BoolColumn get sincronizado => boolean().withDefault(const Constant(false))();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Cola de salida (espejo simplificado de `cola_sincronizacion` en el
/// backend): cada cambio hecho sin conexión queda encolado aquí hasta que
/// el motor de sincronización de la Fase 12 lo envíe al servidor. Esta
/// fase solo escribe la cola; drenarla es responsabilidad de esa fase.
class ColaSincronizacionLocal extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get entidad => text()();
  TextColumn get entidadId => text()();
  TextColumn get payload => text()();
  IntColumn get intentos => integer().withDefault(const Constant(0))();
  DateTimeColumn get creadoEn => dateTime().withDefault(currentDateAndTime)();
}

/// Fase 13 (Bluetooth): en el dispositivo del coordinador, cambios recibidos
/// por Bluetooth de una manipuladora sin señal, en espera de que el
/// coordinador recupere conexión a Internet para reenviarlos al servidor
/// (`/sincronizacion/lote` con tipo BLUETOOTH). La clave única por
/// (dispositivo de origen + entidadId) hace que recibir el mismo ítem dos
/// veces — por ejemplo porque la manipuladora reintentó el envío tras una
/// desconexión sin confirmación — no lo duplique.
class ColaBluetoothRecibida extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get dispositivoOrigenIdentificador => text()();
  TextColumn get dispositivoOrigenTipo => text()();
  TextColumn get usuarioOrigenId => text()();
  TextColumn get entidad => text()();
  TextColumn get entidadId => text()();
  TextColumn get operacion => text()();
  TextColumn get payload => text()();
  DateTimeColumn get timestampLocal => dateTime()();
  DateTimeColumn get creadoEn => dateTime().withDefault(currentDateAndTime)();

  @override
  List<Set<Column<Object>>> get uniqueKeys => [
        {dispositivoOrigenIdentificador, entidadId},
      ];
}

@DriftDatabase(
  tables: [
    EstudiantesCache,
    JornadasCache,
    AsistenciasLocales,
    ColaSincronizacionLocal,
    ColaBluetoothRecibida,
  ],
)
class LocalDatabase extends _$LocalDatabase {
  LocalDatabase() : super(driftDatabase(name: 'sigpae_local'));

  LocalDatabase.forTesting(super.executor);

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) => m.createAll(),
        onUpgrade: (m, from, to) async {
          if (from < 2) {
            await m.createTable(colaBluetoothRecibida);
          }
        },
      );
}
