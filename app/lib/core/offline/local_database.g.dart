// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'local_database.dart';

// ignore_for_file: type=lint
class $EstudiantesCacheTable extends EstudiantesCache
    with TableInfo<$EstudiantesCacheTable, EstudiantesCacheData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $EstudiantesCacheTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _idPaeMeta = const VerificationMeta('idPae');
  @override
  late final GeneratedColumn<String> idPae = GeneratedColumn<String>(
    'id_pae',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nombresMeta = const VerificationMeta(
    'nombres',
  );
  @override
  late final GeneratedColumn<String> nombres = GeneratedColumn<String>(
    'nombres',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _apellidosMeta = const VerificationMeta(
    'apellidos',
  );
  @override
  late final GeneratedColumn<String> apellidos = GeneratedColumn<String>(
    'apellidos',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _sedeIdMeta = const VerificationMeta('sedeId');
  @override
  late final GeneratedColumn<int> sedeId = GeneratedColumn<int>(
    'sede_id',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _estadoMeta = const VerificationMeta('estado');
  @override
  late final GeneratedColumn<String> estado = GeneratedColumn<String>(
    'estado',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    idPae,
    nombres,
    apellidos,
    sedeId,
    estado,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'estudiantes_cache';
  @override
  VerificationContext validateIntegrity(
    Insertable<EstudiantesCacheData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('id_pae')) {
      context.handle(
        _idPaeMeta,
        idPae.isAcceptableOrUnknown(data['id_pae']!, _idPaeMeta),
      );
    } else if (isInserting) {
      context.missing(_idPaeMeta);
    }
    if (data.containsKey('nombres')) {
      context.handle(
        _nombresMeta,
        nombres.isAcceptableOrUnknown(data['nombres']!, _nombresMeta),
      );
    } else if (isInserting) {
      context.missing(_nombresMeta);
    }
    if (data.containsKey('apellidos')) {
      context.handle(
        _apellidosMeta,
        apellidos.isAcceptableOrUnknown(data['apellidos']!, _apellidosMeta),
      );
    } else if (isInserting) {
      context.missing(_apellidosMeta);
    }
    if (data.containsKey('sede_id')) {
      context.handle(
        _sedeIdMeta,
        sedeId.isAcceptableOrUnknown(data['sede_id']!, _sedeIdMeta),
      );
    } else if (isInserting) {
      context.missing(_sedeIdMeta);
    }
    if (data.containsKey('estado')) {
      context.handle(
        _estadoMeta,
        estado.isAcceptableOrUnknown(data['estado']!, _estadoMeta),
      );
    } else if (isInserting) {
      context.missing(_estadoMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  EstudiantesCacheData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return EstudiantesCacheData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      idPae: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id_pae'],
      )!,
      nombres: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nombres'],
      )!,
      apellidos: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}apellidos'],
      )!,
      sedeId: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}sede_id'],
      )!,
      estado: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}estado'],
      )!,
    );
  }

  @override
  $EstudiantesCacheTable createAlias(String alias) {
    return $EstudiantesCacheTable(attachedDatabase, alias);
  }
}

class EstudiantesCacheData extends DataClass
    implements Insertable<EstudiantesCacheData> {
  final String id;
  final String idPae;
  final String nombres;
  final String apellidos;
  final int sedeId;
  final String estado;
  const EstudiantesCacheData({
    required this.id,
    required this.idPae,
    required this.nombres,
    required this.apellidos,
    required this.sedeId,
    required this.estado,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['id_pae'] = Variable<String>(idPae);
    map['nombres'] = Variable<String>(nombres);
    map['apellidos'] = Variable<String>(apellidos);
    map['sede_id'] = Variable<int>(sedeId);
    map['estado'] = Variable<String>(estado);
    return map;
  }

  EstudiantesCacheCompanion toCompanion(bool nullToAbsent) {
    return EstudiantesCacheCompanion(
      id: Value(id),
      idPae: Value(idPae),
      nombres: Value(nombres),
      apellidos: Value(apellidos),
      sedeId: Value(sedeId),
      estado: Value(estado),
    );
  }

  factory EstudiantesCacheData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return EstudiantesCacheData(
      id: serializer.fromJson<String>(json['id']),
      idPae: serializer.fromJson<String>(json['idPae']),
      nombres: serializer.fromJson<String>(json['nombres']),
      apellidos: serializer.fromJson<String>(json['apellidos']),
      sedeId: serializer.fromJson<int>(json['sedeId']),
      estado: serializer.fromJson<String>(json['estado']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'idPae': serializer.toJson<String>(idPae),
      'nombres': serializer.toJson<String>(nombres),
      'apellidos': serializer.toJson<String>(apellidos),
      'sedeId': serializer.toJson<int>(sedeId),
      'estado': serializer.toJson<String>(estado),
    };
  }

  EstudiantesCacheData copyWith({
    String? id,
    String? idPae,
    String? nombres,
    String? apellidos,
    int? sedeId,
    String? estado,
  }) => EstudiantesCacheData(
    id: id ?? this.id,
    idPae: idPae ?? this.idPae,
    nombres: nombres ?? this.nombres,
    apellidos: apellidos ?? this.apellidos,
    sedeId: sedeId ?? this.sedeId,
    estado: estado ?? this.estado,
  );
  EstudiantesCacheData copyWithCompanion(EstudiantesCacheCompanion data) {
    return EstudiantesCacheData(
      id: data.id.present ? data.id.value : this.id,
      idPae: data.idPae.present ? data.idPae.value : this.idPae,
      nombres: data.nombres.present ? data.nombres.value : this.nombres,
      apellidos: data.apellidos.present ? data.apellidos.value : this.apellidos,
      sedeId: data.sedeId.present ? data.sedeId.value : this.sedeId,
      estado: data.estado.present ? data.estado.value : this.estado,
    );
  }

  @override
  String toString() {
    return (StringBuffer('EstudiantesCacheData(')
          ..write('id: $id, ')
          ..write('idPae: $idPae, ')
          ..write('nombres: $nombres, ')
          ..write('apellidos: $apellidos, ')
          ..write('sedeId: $sedeId, ')
          ..write('estado: $estado')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, idPae, nombres, apellidos, sedeId, estado);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is EstudiantesCacheData &&
          other.id == this.id &&
          other.idPae == this.idPae &&
          other.nombres == this.nombres &&
          other.apellidos == this.apellidos &&
          other.sedeId == this.sedeId &&
          other.estado == this.estado);
}

class EstudiantesCacheCompanion extends UpdateCompanion<EstudiantesCacheData> {
  final Value<String> id;
  final Value<String> idPae;
  final Value<String> nombres;
  final Value<String> apellidos;
  final Value<int> sedeId;
  final Value<String> estado;
  final Value<int> rowid;
  const EstudiantesCacheCompanion({
    this.id = const Value.absent(),
    this.idPae = const Value.absent(),
    this.nombres = const Value.absent(),
    this.apellidos = const Value.absent(),
    this.sedeId = const Value.absent(),
    this.estado = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  EstudiantesCacheCompanion.insert({
    required String id,
    required String idPae,
    required String nombres,
    required String apellidos,
    required int sedeId,
    required String estado,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       idPae = Value(idPae),
       nombres = Value(nombres),
       apellidos = Value(apellidos),
       sedeId = Value(sedeId),
       estado = Value(estado);
  static Insertable<EstudiantesCacheData> custom({
    Expression<String>? id,
    Expression<String>? idPae,
    Expression<String>? nombres,
    Expression<String>? apellidos,
    Expression<int>? sedeId,
    Expression<String>? estado,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (idPae != null) 'id_pae': idPae,
      if (nombres != null) 'nombres': nombres,
      if (apellidos != null) 'apellidos': apellidos,
      if (sedeId != null) 'sede_id': sedeId,
      if (estado != null) 'estado': estado,
      if (rowid != null) 'rowid': rowid,
    });
  }

  EstudiantesCacheCompanion copyWith({
    Value<String>? id,
    Value<String>? idPae,
    Value<String>? nombres,
    Value<String>? apellidos,
    Value<int>? sedeId,
    Value<String>? estado,
    Value<int>? rowid,
  }) {
    return EstudiantesCacheCompanion(
      id: id ?? this.id,
      idPae: idPae ?? this.idPae,
      nombres: nombres ?? this.nombres,
      apellidos: apellidos ?? this.apellidos,
      sedeId: sedeId ?? this.sedeId,
      estado: estado ?? this.estado,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (idPae.present) {
      map['id_pae'] = Variable<String>(idPae.value);
    }
    if (nombres.present) {
      map['nombres'] = Variable<String>(nombres.value);
    }
    if (apellidos.present) {
      map['apellidos'] = Variable<String>(apellidos.value);
    }
    if (sedeId.present) {
      map['sede_id'] = Variable<int>(sedeId.value);
    }
    if (estado.present) {
      map['estado'] = Variable<String>(estado.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('EstudiantesCacheCompanion(')
          ..write('id: $id, ')
          ..write('idPae: $idPae, ')
          ..write('nombres: $nombres, ')
          ..write('apellidos: $apellidos, ')
          ..write('sedeId: $sedeId, ')
          ..write('estado: $estado, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $JornadasCacheTable extends JornadasCache
    with TableInfo<$JornadasCacheTable, JornadasCacheData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $JornadasCacheTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _sedeIdMeta = const VerificationMeta('sedeId');
  @override
  late final GeneratedColumn<int> sedeId = GeneratedColumn<int>(
    'sede_id',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _fechaMeta = const VerificationMeta('fecha');
  @override
  late final GeneratedColumn<DateTime> fecha = GeneratedColumn<DateTime>(
    'fecha',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _estadoMeta = const VerificationMeta('estado');
  @override
  late final GeneratedColumn<String> estado = GeneratedColumn<String>(
    'estado',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [id, sedeId, fecha, estado];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'jornadas_cache';
  @override
  VerificationContext validateIntegrity(
    Insertable<JornadasCacheData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('sede_id')) {
      context.handle(
        _sedeIdMeta,
        sedeId.isAcceptableOrUnknown(data['sede_id']!, _sedeIdMeta),
      );
    } else if (isInserting) {
      context.missing(_sedeIdMeta);
    }
    if (data.containsKey('fecha')) {
      context.handle(
        _fechaMeta,
        fecha.isAcceptableOrUnknown(data['fecha']!, _fechaMeta),
      );
    } else if (isInserting) {
      context.missing(_fechaMeta);
    }
    if (data.containsKey('estado')) {
      context.handle(
        _estadoMeta,
        estado.isAcceptableOrUnknown(data['estado']!, _estadoMeta),
      );
    } else if (isInserting) {
      context.missing(_estadoMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  JornadasCacheData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return JornadasCacheData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      sedeId: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}sede_id'],
      )!,
      fecha: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}fecha'],
      )!,
      estado: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}estado'],
      )!,
    );
  }

  @override
  $JornadasCacheTable createAlias(String alias) {
    return $JornadasCacheTable(attachedDatabase, alias);
  }
}

class JornadasCacheData extends DataClass
    implements Insertable<JornadasCacheData> {
  final String id;
  final int sedeId;
  final DateTime fecha;
  final String estado;
  const JornadasCacheData({
    required this.id,
    required this.sedeId,
    required this.fecha,
    required this.estado,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['sede_id'] = Variable<int>(sedeId);
    map['fecha'] = Variable<DateTime>(fecha);
    map['estado'] = Variable<String>(estado);
    return map;
  }

  JornadasCacheCompanion toCompanion(bool nullToAbsent) {
    return JornadasCacheCompanion(
      id: Value(id),
      sedeId: Value(sedeId),
      fecha: Value(fecha),
      estado: Value(estado),
    );
  }

  factory JornadasCacheData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return JornadasCacheData(
      id: serializer.fromJson<String>(json['id']),
      sedeId: serializer.fromJson<int>(json['sedeId']),
      fecha: serializer.fromJson<DateTime>(json['fecha']),
      estado: serializer.fromJson<String>(json['estado']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'sedeId': serializer.toJson<int>(sedeId),
      'fecha': serializer.toJson<DateTime>(fecha),
      'estado': serializer.toJson<String>(estado),
    };
  }

  JornadasCacheData copyWith({
    String? id,
    int? sedeId,
    DateTime? fecha,
    String? estado,
  }) => JornadasCacheData(
    id: id ?? this.id,
    sedeId: sedeId ?? this.sedeId,
    fecha: fecha ?? this.fecha,
    estado: estado ?? this.estado,
  );
  JornadasCacheData copyWithCompanion(JornadasCacheCompanion data) {
    return JornadasCacheData(
      id: data.id.present ? data.id.value : this.id,
      sedeId: data.sedeId.present ? data.sedeId.value : this.sedeId,
      fecha: data.fecha.present ? data.fecha.value : this.fecha,
      estado: data.estado.present ? data.estado.value : this.estado,
    );
  }

  @override
  String toString() {
    return (StringBuffer('JornadasCacheData(')
          ..write('id: $id, ')
          ..write('sedeId: $sedeId, ')
          ..write('fecha: $fecha, ')
          ..write('estado: $estado')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, sedeId, fecha, estado);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is JornadasCacheData &&
          other.id == this.id &&
          other.sedeId == this.sedeId &&
          other.fecha == this.fecha &&
          other.estado == this.estado);
}

class JornadasCacheCompanion extends UpdateCompanion<JornadasCacheData> {
  final Value<String> id;
  final Value<int> sedeId;
  final Value<DateTime> fecha;
  final Value<String> estado;
  final Value<int> rowid;
  const JornadasCacheCompanion({
    this.id = const Value.absent(),
    this.sedeId = const Value.absent(),
    this.fecha = const Value.absent(),
    this.estado = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  JornadasCacheCompanion.insert({
    required String id,
    required int sedeId,
    required DateTime fecha,
    required String estado,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       sedeId = Value(sedeId),
       fecha = Value(fecha),
       estado = Value(estado);
  static Insertable<JornadasCacheData> custom({
    Expression<String>? id,
    Expression<int>? sedeId,
    Expression<DateTime>? fecha,
    Expression<String>? estado,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (sedeId != null) 'sede_id': sedeId,
      if (fecha != null) 'fecha': fecha,
      if (estado != null) 'estado': estado,
      if (rowid != null) 'rowid': rowid,
    });
  }

  JornadasCacheCompanion copyWith({
    Value<String>? id,
    Value<int>? sedeId,
    Value<DateTime>? fecha,
    Value<String>? estado,
    Value<int>? rowid,
  }) {
    return JornadasCacheCompanion(
      id: id ?? this.id,
      sedeId: sedeId ?? this.sedeId,
      fecha: fecha ?? this.fecha,
      estado: estado ?? this.estado,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (sedeId.present) {
      map['sede_id'] = Variable<int>(sedeId.value);
    }
    if (fecha.present) {
      map['fecha'] = Variable<DateTime>(fecha.value);
    }
    if (estado.present) {
      map['estado'] = Variable<String>(estado.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('JornadasCacheCompanion(')
          ..write('id: $id, ')
          ..write('sedeId: $sedeId, ')
          ..write('fecha: $fecha, ')
          ..write('estado: $estado, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $AsistenciasLocalesTable extends AsistenciasLocales
    with TableInfo<$AsistenciasLocalesTable, AsistenciasLocale> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $AsistenciasLocalesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _estudianteIdMeta = const VerificationMeta(
    'estudianteId',
  );
  @override
  late final GeneratedColumn<String> estudianteId = GeneratedColumn<String>(
    'estudiante_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _jornadaIdMeta = const VerificationMeta(
    'jornadaId',
  );
  @override
  late final GeneratedColumn<String> jornadaId = GeneratedColumn<String>(
    'jornada_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _estadoMeta = const VerificationMeta('estado');
  @override
  late final GeneratedColumn<String> estado = GeneratedColumn<String>(
    'estado',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _fechaHoraRegistroMeta = const VerificationMeta(
    'fechaHoraRegistro',
  );
  @override
  late final GeneratedColumn<DateTime> fechaHoraRegistro =
      GeneratedColumn<DateTime>(
        'fecha_hora_registro',
        aliasedName,
        false,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: true,
      );
  static const VerificationMeta _sincronizadoMeta = const VerificationMeta(
    'sincronizado',
  );
  @override
  late final GeneratedColumn<bool> sincronizado = GeneratedColumn<bool>(
    'sincronizado',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("sincronizado" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    estudianteId,
    jornadaId,
    estado,
    fechaHoraRegistro,
    sincronizado,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'asistencias_locales';
  @override
  VerificationContext validateIntegrity(
    Insertable<AsistenciasLocale> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('estudiante_id')) {
      context.handle(
        _estudianteIdMeta,
        estudianteId.isAcceptableOrUnknown(
          data['estudiante_id']!,
          _estudianteIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_estudianteIdMeta);
    }
    if (data.containsKey('jornada_id')) {
      context.handle(
        _jornadaIdMeta,
        jornadaId.isAcceptableOrUnknown(data['jornada_id']!, _jornadaIdMeta),
      );
    } else if (isInserting) {
      context.missing(_jornadaIdMeta);
    }
    if (data.containsKey('estado')) {
      context.handle(
        _estadoMeta,
        estado.isAcceptableOrUnknown(data['estado']!, _estadoMeta),
      );
    } else if (isInserting) {
      context.missing(_estadoMeta);
    }
    if (data.containsKey('fecha_hora_registro')) {
      context.handle(
        _fechaHoraRegistroMeta,
        fechaHoraRegistro.isAcceptableOrUnknown(
          data['fecha_hora_registro']!,
          _fechaHoraRegistroMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_fechaHoraRegistroMeta);
    }
    if (data.containsKey('sincronizado')) {
      context.handle(
        _sincronizadoMeta,
        sincronizado.isAcceptableOrUnknown(
          data['sincronizado']!,
          _sincronizadoMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  AsistenciasLocale map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return AsistenciasLocale(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      estudianteId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}estudiante_id'],
      )!,
      jornadaId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}jornada_id'],
      )!,
      estado: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}estado'],
      )!,
      fechaHoraRegistro: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}fecha_hora_registro'],
      )!,
      sincronizado: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}sincronizado'],
      )!,
    );
  }

  @override
  $AsistenciasLocalesTable createAlias(String alias) {
    return $AsistenciasLocalesTable(attachedDatabase, alias);
  }
}

class AsistenciasLocale extends DataClass
    implements Insertable<AsistenciasLocale> {
  final String id;
  final String estudianteId;
  final String jornadaId;
  final String estado;
  final DateTime fechaHoraRegistro;
  final bool sincronizado;
  const AsistenciasLocale({
    required this.id,
    required this.estudianteId,
    required this.jornadaId,
    required this.estado,
    required this.fechaHoraRegistro,
    required this.sincronizado,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['estudiante_id'] = Variable<String>(estudianteId);
    map['jornada_id'] = Variable<String>(jornadaId);
    map['estado'] = Variable<String>(estado);
    map['fecha_hora_registro'] = Variable<DateTime>(fechaHoraRegistro);
    map['sincronizado'] = Variable<bool>(sincronizado);
    return map;
  }

  AsistenciasLocalesCompanion toCompanion(bool nullToAbsent) {
    return AsistenciasLocalesCompanion(
      id: Value(id),
      estudianteId: Value(estudianteId),
      jornadaId: Value(jornadaId),
      estado: Value(estado),
      fechaHoraRegistro: Value(fechaHoraRegistro),
      sincronizado: Value(sincronizado),
    );
  }

  factory AsistenciasLocale.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return AsistenciasLocale(
      id: serializer.fromJson<String>(json['id']),
      estudianteId: serializer.fromJson<String>(json['estudianteId']),
      jornadaId: serializer.fromJson<String>(json['jornadaId']),
      estado: serializer.fromJson<String>(json['estado']),
      fechaHoraRegistro: serializer.fromJson<DateTime>(
        json['fechaHoraRegistro'],
      ),
      sincronizado: serializer.fromJson<bool>(json['sincronizado']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'estudianteId': serializer.toJson<String>(estudianteId),
      'jornadaId': serializer.toJson<String>(jornadaId),
      'estado': serializer.toJson<String>(estado),
      'fechaHoraRegistro': serializer.toJson<DateTime>(fechaHoraRegistro),
      'sincronizado': serializer.toJson<bool>(sincronizado),
    };
  }

  AsistenciasLocale copyWith({
    String? id,
    String? estudianteId,
    String? jornadaId,
    String? estado,
    DateTime? fechaHoraRegistro,
    bool? sincronizado,
  }) => AsistenciasLocale(
    id: id ?? this.id,
    estudianteId: estudianteId ?? this.estudianteId,
    jornadaId: jornadaId ?? this.jornadaId,
    estado: estado ?? this.estado,
    fechaHoraRegistro: fechaHoraRegistro ?? this.fechaHoraRegistro,
    sincronizado: sincronizado ?? this.sincronizado,
  );
  AsistenciasLocale copyWithCompanion(AsistenciasLocalesCompanion data) {
    return AsistenciasLocale(
      id: data.id.present ? data.id.value : this.id,
      estudianteId: data.estudianteId.present
          ? data.estudianteId.value
          : this.estudianteId,
      jornadaId: data.jornadaId.present ? data.jornadaId.value : this.jornadaId,
      estado: data.estado.present ? data.estado.value : this.estado,
      fechaHoraRegistro: data.fechaHoraRegistro.present
          ? data.fechaHoraRegistro.value
          : this.fechaHoraRegistro,
      sincronizado: data.sincronizado.present
          ? data.sincronizado.value
          : this.sincronizado,
    );
  }

  @override
  String toString() {
    return (StringBuffer('AsistenciasLocale(')
          ..write('id: $id, ')
          ..write('estudianteId: $estudianteId, ')
          ..write('jornadaId: $jornadaId, ')
          ..write('estado: $estado, ')
          ..write('fechaHoraRegistro: $fechaHoraRegistro, ')
          ..write('sincronizado: $sincronizado')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    estudianteId,
    jornadaId,
    estado,
    fechaHoraRegistro,
    sincronizado,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is AsistenciasLocale &&
          other.id == this.id &&
          other.estudianteId == this.estudianteId &&
          other.jornadaId == this.jornadaId &&
          other.estado == this.estado &&
          other.fechaHoraRegistro == this.fechaHoraRegistro &&
          other.sincronizado == this.sincronizado);
}

class AsistenciasLocalesCompanion extends UpdateCompanion<AsistenciasLocale> {
  final Value<String> id;
  final Value<String> estudianteId;
  final Value<String> jornadaId;
  final Value<String> estado;
  final Value<DateTime> fechaHoraRegistro;
  final Value<bool> sincronizado;
  final Value<int> rowid;
  const AsistenciasLocalesCompanion({
    this.id = const Value.absent(),
    this.estudianteId = const Value.absent(),
    this.jornadaId = const Value.absent(),
    this.estado = const Value.absent(),
    this.fechaHoraRegistro = const Value.absent(),
    this.sincronizado = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  AsistenciasLocalesCompanion.insert({
    required String id,
    required String estudianteId,
    required String jornadaId,
    required String estado,
    required DateTime fechaHoraRegistro,
    this.sincronizado = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       estudianteId = Value(estudianteId),
       jornadaId = Value(jornadaId),
       estado = Value(estado),
       fechaHoraRegistro = Value(fechaHoraRegistro);
  static Insertable<AsistenciasLocale> custom({
    Expression<String>? id,
    Expression<String>? estudianteId,
    Expression<String>? jornadaId,
    Expression<String>? estado,
    Expression<DateTime>? fechaHoraRegistro,
    Expression<bool>? sincronizado,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (estudianteId != null) 'estudiante_id': estudianteId,
      if (jornadaId != null) 'jornada_id': jornadaId,
      if (estado != null) 'estado': estado,
      if (fechaHoraRegistro != null) 'fecha_hora_registro': fechaHoraRegistro,
      if (sincronizado != null) 'sincronizado': sincronizado,
      if (rowid != null) 'rowid': rowid,
    });
  }

  AsistenciasLocalesCompanion copyWith({
    Value<String>? id,
    Value<String>? estudianteId,
    Value<String>? jornadaId,
    Value<String>? estado,
    Value<DateTime>? fechaHoraRegistro,
    Value<bool>? sincronizado,
    Value<int>? rowid,
  }) {
    return AsistenciasLocalesCompanion(
      id: id ?? this.id,
      estudianteId: estudianteId ?? this.estudianteId,
      jornadaId: jornadaId ?? this.jornadaId,
      estado: estado ?? this.estado,
      fechaHoraRegistro: fechaHoraRegistro ?? this.fechaHoraRegistro,
      sincronizado: sincronizado ?? this.sincronizado,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (estudianteId.present) {
      map['estudiante_id'] = Variable<String>(estudianteId.value);
    }
    if (jornadaId.present) {
      map['jornada_id'] = Variable<String>(jornadaId.value);
    }
    if (estado.present) {
      map['estado'] = Variable<String>(estado.value);
    }
    if (fechaHoraRegistro.present) {
      map['fecha_hora_registro'] = Variable<DateTime>(fechaHoraRegistro.value);
    }
    if (sincronizado.present) {
      map['sincronizado'] = Variable<bool>(sincronizado.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('AsistenciasLocalesCompanion(')
          ..write('id: $id, ')
          ..write('estudianteId: $estudianteId, ')
          ..write('jornadaId: $jornadaId, ')
          ..write('estado: $estado, ')
          ..write('fechaHoraRegistro: $fechaHoraRegistro, ')
          ..write('sincronizado: $sincronizado, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $ColaSincronizacionLocalTable extends ColaSincronizacionLocal
    with TableInfo<$ColaSincronizacionLocalTable, ColaSincronizacionLocalData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ColaSincronizacionLocalTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _entidadMeta = const VerificationMeta(
    'entidad',
  );
  @override
  late final GeneratedColumn<String> entidad = GeneratedColumn<String>(
    'entidad',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _entidadIdMeta = const VerificationMeta(
    'entidadId',
  );
  @override
  late final GeneratedColumn<String> entidadId = GeneratedColumn<String>(
    'entidad_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _intentosMeta = const VerificationMeta(
    'intentos',
  );
  @override
  late final GeneratedColumn<int> intentos = GeneratedColumn<int>(
    'intentos',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _creadoEnMeta = const VerificationMeta(
    'creadoEn',
  );
  @override
  late final GeneratedColumn<DateTime> creadoEn = GeneratedColumn<DateTime>(
    'creado_en',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    entidad,
    entidadId,
    payload,
    intentos,
    creadoEn,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cola_sincronizacion_local';
  @override
  VerificationContext validateIntegrity(
    Insertable<ColaSincronizacionLocalData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('entidad')) {
      context.handle(
        _entidadMeta,
        entidad.isAcceptableOrUnknown(data['entidad']!, _entidadMeta),
      );
    } else if (isInserting) {
      context.missing(_entidadMeta);
    }
    if (data.containsKey('entidad_id')) {
      context.handle(
        _entidadIdMeta,
        entidadId.isAcceptableOrUnknown(data['entidad_id']!, _entidadIdMeta),
      );
    } else if (isInserting) {
      context.missing(_entidadIdMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('intentos')) {
      context.handle(
        _intentosMeta,
        intentos.isAcceptableOrUnknown(data['intentos']!, _intentosMeta),
      );
    }
    if (data.containsKey('creado_en')) {
      context.handle(
        _creadoEnMeta,
        creadoEn.isAcceptableOrUnknown(data['creado_en']!, _creadoEnMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  ColaSincronizacionLocalData map(
    Map<String, dynamic> data, {
    String? tablePrefix,
  }) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ColaSincronizacionLocalData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      entidad: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}entidad'],
      )!,
      entidadId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}entidad_id'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
      intentos: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}intentos'],
      )!,
      creadoEn: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}creado_en'],
      )!,
    );
  }

  @override
  $ColaSincronizacionLocalTable createAlias(String alias) {
    return $ColaSincronizacionLocalTable(attachedDatabase, alias);
  }
}

class ColaSincronizacionLocalData extends DataClass
    implements Insertable<ColaSincronizacionLocalData> {
  final int id;
  final String entidad;
  final String entidadId;
  final String payload;
  final int intentos;
  final DateTime creadoEn;
  const ColaSincronizacionLocalData({
    required this.id,
    required this.entidad,
    required this.entidadId,
    required this.payload,
    required this.intentos,
    required this.creadoEn,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['entidad'] = Variable<String>(entidad);
    map['entidad_id'] = Variable<String>(entidadId);
    map['payload'] = Variable<String>(payload);
    map['intentos'] = Variable<int>(intentos);
    map['creado_en'] = Variable<DateTime>(creadoEn);
    return map;
  }

  ColaSincronizacionLocalCompanion toCompanion(bool nullToAbsent) {
    return ColaSincronizacionLocalCompanion(
      id: Value(id),
      entidad: Value(entidad),
      entidadId: Value(entidadId),
      payload: Value(payload),
      intentos: Value(intentos),
      creadoEn: Value(creadoEn),
    );
  }

  factory ColaSincronizacionLocalData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ColaSincronizacionLocalData(
      id: serializer.fromJson<int>(json['id']),
      entidad: serializer.fromJson<String>(json['entidad']),
      entidadId: serializer.fromJson<String>(json['entidadId']),
      payload: serializer.fromJson<String>(json['payload']),
      intentos: serializer.fromJson<int>(json['intentos']),
      creadoEn: serializer.fromJson<DateTime>(json['creadoEn']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'entidad': serializer.toJson<String>(entidad),
      'entidadId': serializer.toJson<String>(entidadId),
      'payload': serializer.toJson<String>(payload),
      'intentos': serializer.toJson<int>(intentos),
      'creadoEn': serializer.toJson<DateTime>(creadoEn),
    };
  }

  ColaSincronizacionLocalData copyWith({
    int? id,
    String? entidad,
    String? entidadId,
    String? payload,
    int? intentos,
    DateTime? creadoEn,
  }) => ColaSincronizacionLocalData(
    id: id ?? this.id,
    entidad: entidad ?? this.entidad,
    entidadId: entidadId ?? this.entidadId,
    payload: payload ?? this.payload,
    intentos: intentos ?? this.intentos,
    creadoEn: creadoEn ?? this.creadoEn,
  );
  ColaSincronizacionLocalData copyWithCompanion(
    ColaSincronizacionLocalCompanion data,
  ) {
    return ColaSincronizacionLocalData(
      id: data.id.present ? data.id.value : this.id,
      entidad: data.entidad.present ? data.entidad.value : this.entidad,
      entidadId: data.entidadId.present ? data.entidadId.value : this.entidadId,
      payload: data.payload.present ? data.payload.value : this.payload,
      intentos: data.intentos.present ? data.intentos.value : this.intentos,
      creadoEn: data.creadoEn.present ? data.creadoEn.value : this.creadoEn,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ColaSincronizacionLocalData(')
          ..write('id: $id, ')
          ..write('entidad: $entidad, ')
          ..write('entidadId: $entidadId, ')
          ..write('payload: $payload, ')
          ..write('intentos: $intentos, ')
          ..write('creadoEn: $creadoEn')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, entidad, entidadId, payload, intentos, creadoEn);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ColaSincronizacionLocalData &&
          other.id == this.id &&
          other.entidad == this.entidad &&
          other.entidadId == this.entidadId &&
          other.payload == this.payload &&
          other.intentos == this.intentos &&
          other.creadoEn == this.creadoEn);
}

class ColaSincronizacionLocalCompanion
    extends UpdateCompanion<ColaSincronizacionLocalData> {
  final Value<int> id;
  final Value<String> entidad;
  final Value<String> entidadId;
  final Value<String> payload;
  final Value<int> intentos;
  final Value<DateTime> creadoEn;
  const ColaSincronizacionLocalCompanion({
    this.id = const Value.absent(),
    this.entidad = const Value.absent(),
    this.entidadId = const Value.absent(),
    this.payload = const Value.absent(),
    this.intentos = const Value.absent(),
    this.creadoEn = const Value.absent(),
  });
  ColaSincronizacionLocalCompanion.insert({
    this.id = const Value.absent(),
    required String entidad,
    required String entidadId,
    required String payload,
    this.intentos = const Value.absent(),
    this.creadoEn = const Value.absent(),
  }) : entidad = Value(entidad),
       entidadId = Value(entidadId),
       payload = Value(payload);
  static Insertable<ColaSincronizacionLocalData> custom({
    Expression<int>? id,
    Expression<String>? entidad,
    Expression<String>? entidadId,
    Expression<String>? payload,
    Expression<int>? intentos,
    Expression<DateTime>? creadoEn,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (entidad != null) 'entidad': entidad,
      if (entidadId != null) 'entidad_id': entidadId,
      if (payload != null) 'payload': payload,
      if (intentos != null) 'intentos': intentos,
      if (creadoEn != null) 'creado_en': creadoEn,
    });
  }

  ColaSincronizacionLocalCompanion copyWith({
    Value<int>? id,
    Value<String>? entidad,
    Value<String>? entidadId,
    Value<String>? payload,
    Value<int>? intentos,
    Value<DateTime>? creadoEn,
  }) {
    return ColaSincronizacionLocalCompanion(
      id: id ?? this.id,
      entidad: entidad ?? this.entidad,
      entidadId: entidadId ?? this.entidadId,
      payload: payload ?? this.payload,
      intentos: intentos ?? this.intentos,
      creadoEn: creadoEn ?? this.creadoEn,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (entidad.present) {
      map['entidad'] = Variable<String>(entidad.value);
    }
    if (entidadId.present) {
      map['entidad_id'] = Variable<String>(entidadId.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (intentos.present) {
      map['intentos'] = Variable<int>(intentos.value);
    }
    if (creadoEn.present) {
      map['creado_en'] = Variable<DateTime>(creadoEn.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ColaSincronizacionLocalCompanion(')
          ..write('id: $id, ')
          ..write('entidad: $entidad, ')
          ..write('entidadId: $entidadId, ')
          ..write('payload: $payload, ')
          ..write('intentos: $intentos, ')
          ..write('creadoEn: $creadoEn')
          ..write(')'))
        .toString();
  }
}

abstract class _$LocalDatabase extends GeneratedDatabase {
  _$LocalDatabase(QueryExecutor e) : super(e);
  $LocalDatabaseManager get managers => $LocalDatabaseManager(this);
  late final $EstudiantesCacheTable estudiantesCache = $EstudiantesCacheTable(
    this,
  );
  late final $JornadasCacheTable jornadasCache = $JornadasCacheTable(this);
  late final $AsistenciasLocalesTable asistenciasLocales =
      $AsistenciasLocalesTable(this);
  late final $ColaSincronizacionLocalTable colaSincronizacionLocal =
      $ColaSincronizacionLocalTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    estudiantesCache,
    jornadasCache,
    asistenciasLocales,
    colaSincronizacionLocal,
  ];
}

typedef $$EstudiantesCacheTableCreateCompanionBuilder =
    EstudiantesCacheCompanion Function({
      required String id,
      required String idPae,
      required String nombres,
      required String apellidos,
      required int sedeId,
      required String estado,
      Value<int> rowid,
    });
typedef $$EstudiantesCacheTableUpdateCompanionBuilder =
    EstudiantesCacheCompanion Function({
      Value<String> id,
      Value<String> idPae,
      Value<String> nombres,
      Value<String> apellidos,
      Value<int> sedeId,
      Value<String> estado,
      Value<int> rowid,
    });

class $$EstudiantesCacheTableFilterComposer
    extends Composer<_$LocalDatabase, $EstudiantesCacheTable> {
  $$EstudiantesCacheTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get idPae => $composableBuilder(
    column: $table.idPae,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nombres => $composableBuilder(
    column: $table.nombres,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get apellidos => $composableBuilder(
    column: $table.apellidos,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get sedeId => $composableBuilder(
    column: $table.sedeId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get estado => $composableBuilder(
    column: $table.estado,
    builder: (column) => ColumnFilters(column),
  );
}

class $$EstudiantesCacheTableOrderingComposer
    extends Composer<_$LocalDatabase, $EstudiantesCacheTable> {
  $$EstudiantesCacheTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get idPae => $composableBuilder(
    column: $table.idPae,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nombres => $composableBuilder(
    column: $table.nombres,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get apellidos => $composableBuilder(
    column: $table.apellidos,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get sedeId => $composableBuilder(
    column: $table.sedeId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get estado => $composableBuilder(
    column: $table.estado,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$EstudiantesCacheTableAnnotationComposer
    extends Composer<_$LocalDatabase, $EstudiantesCacheTable> {
  $$EstudiantesCacheTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get idPae =>
      $composableBuilder(column: $table.idPae, builder: (column) => column);

  GeneratedColumn<String> get nombres =>
      $composableBuilder(column: $table.nombres, builder: (column) => column);

  GeneratedColumn<String> get apellidos =>
      $composableBuilder(column: $table.apellidos, builder: (column) => column);

  GeneratedColumn<int> get sedeId =>
      $composableBuilder(column: $table.sedeId, builder: (column) => column);

  GeneratedColumn<String> get estado =>
      $composableBuilder(column: $table.estado, builder: (column) => column);
}

class $$EstudiantesCacheTableTableManager
    extends
        RootTableManager<
          _$LocalDatabase,
          $EstudiantesCacheTable,
          EstudiantesCacheData,
          $$EstudiantesCacheTableFilterComposer,
          $$EstudiantesCacheTableOrderingComposer,
          $$EstudiantesCacheTableAnnotationComposer,
          $$EstudiantesCacheTableCreateCompanionBuilder,
          $$EstudiantesCacheTableUpdateCompanionBuilder,
          (
            EstudiantesCacheData,
            BaseReferences<
              _$LocalDatabase,
              $EstudiantesCacheTable,
              EstudiantesCacheData
            >,
          ),
          EstudiantesCacheData,
          PrefetchHooks Function()
        > {
  $$EstudiantesCacheTableTableManager(
    _$LocalDatabase db,
    $EstudiantesCacheTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$EstudiantesCacheTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$EstudiantesCacheTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$EstudiantesCacheTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> idPae = const Value.absent(),
                Value<String> nombres = const Value.absent(),
                Value<String> apellidos = const Value.absent(),
                Value<int> sedeId = const Value.absent(),
                Value<String> estado = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => EstudiantesCacheCompanion(
                id: id,
                idPae: idPae,
                nombres: nombres,
                apellidos: apellidos,
                sedeId: sedeId,
                estado: estado,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String idPae,
                required String nombres,
                required String apellidos,
                required int sedeId,
                required String estado,
                Value<int> rowid = const Value.absent(),
              }) => EstudiantesCacheCompanion.insert(
                id: id,
                idPae: idPae,
                nombres: nombres,
                apellidos: apellidos,
                sedeId: sedeId,
                estado: estado,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$EstudiantesCacheTable, EstudiantesCacheData>(
                    table,
                  ),
                  BaseReferences<
                    _$LocalDatabase,
                    $EstudiantesCacheTable,
                    EstudiantesCacheData
                  >(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$EstudiantesCacheTableProcessedTableManager =
    ProcessedTableManager<
      _$LocalDatabase,
      $EstudiantesCacheTable,
      EstudiantesCacheData,
      $$EstudiantesCacheTableFilterComposer,
      $$EstudiantesCacheTableOrderingComposer,
      $$EstudiantesCacheTableAnnotationComposer,
      $$EstudiantesCacheTableCreateCompanionBuilder,
      $$EstudiantesCacheTableUpdateCompanionBuilder,
      (
        EstudiantesCacheData,
        BaseReferences<
          _$LocalDatabase,
          $EstudiantesCacheTable,
          EstudiantesCacheData
        >,
      ),
      EstudiantesCacheData,
      PrefetchHooks Function()
    >;
typedef $$JornadasCacheTableCreateCompanionBuilder =
    JornadasCacheCompanion Function({
      required String id,
      required int sedeId,
      required DateTime fecha,
      required String estado,
      Value<int> rowid,
    });
typedef $$JornadasCacheTableUpdateCompanionBuilder =
    JornadasCacheCompanion Function({
      Value<String> id,
      Value<int> sedeId,
      Value<DateTime> fecha,
      Value<String> estado,
      Value<int> rowid,
    });

class $$JornadasCacheTableFilterComposer
    extends Composer<_$LocalDatabase, $JornadasCacheTable> {
  $$JornadasCacheTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get sedeId => $composableBuilder(
    column: $table.sedeId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get fecha => $composableBuilder(
    column: $table.fecha,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get estado => $composableBuilder(
    column: $table.estado,
    builder: (column) => ColumnFilters(column),
  );
}

class $$JornadasCacheTableOrderingComposer
    extends Composer<_$LocalDatabase, $JornadasCacheTable> {
  $$JornadasCacheTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get sedeId => $composableBuilder(
    column: $table.sedeId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get fecha => $composableBuilder(
    column: $table.fecha,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get estado => $composableBuilder(
    column: $table.estado,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$JornadasCacheTableAnnotationComposer
    extends Composer<_$LocalDatabase, $JornadasCacheTable> {
  $$JornadasCacheTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<int> get sedeId =>
      $composableBuilder(column: $table.sedeId, builder: (column) => column);

  GeneratedColumn<DateTime> get fecha =>
      $composableBuilder(column: $table.fecha, builder: (column) => column);

  GeneratedColumn<String> get estado =>
      $composableBuilder(column: $table.estado, builder: (column) => column);
}

class $$JornadasCacheTableTableManager
    extends
        RootTableManager<
          _$LocalDatabase,
          $JornadasCacheTable,
          JornadasCacheData,
          $$JornadasCacheTableFilterComposer,
          $$JornadasCacheTableOrderingComposer,
          $$JornadasCacheTableAnnotationComposer,
          $$JornadasCacheTableCreateCompanionBuilder,
          $$JornadasCacheTableUpdateCompanionBuilder,
          (
            JornadasCacheData,
            BaseReferences<
              _$LocalDatabase,
              $JornadasCacheTable,
              JornadasCacheData
            >,
          ),
          JornadasCacheData,
          PrefetchHooks Function()
        > {
  $$JornadasCacheTableTableManager(
    _$LocalDatabase db,
    $JornadasCacheTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$JornadasCacheTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$JornadasCacheTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$JornadasCacheTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<int> sedeId = const Value.absent(),
                Value<DateTime> fecha = const Value.absent(),
                Value<String> estado = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => JornadasCacheCompanion(
                id: id,
                sedeId: sedeId,
                fecha: fecha,
                estado: estado,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required int sedeId,
                required DateTime fecha,
                required String estado,
                Value<int> rowid = const Value.absent(),
              }) => JornadasCacheCompanion.insert(
                id: id,
                sedeId: sedeId,
                fecha: fecha,
                estado: estado,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$JornadasCacheTable, JornadasCacheData>(table),
                  BaseReferences<
                    _$LocalDatabase,
                    $JornadasCacheTable,
                    JornadasCacheData
                  >(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$JornadasCacheTableProcessedTableManager =
    ProcessedTableManager<
      _$LocalDatabase,
      $JornadasCacheTable,
      JornadasCacheData,
      $$JornadasCacheTableFilterComposer,
      $$JornadasCacheTableOrderingComposer,
      $$JornadasCacheTableAnnotationComposer,
      $$JornadasCacheTableCreateCompanionBuilder,
      $$JornadasCacheTableUpdateCompanionBuilder,
      (
        JornadasCacheData,
        BaseReferences<_$LocalDatabase, $JornadasCacheTable, JornadasCacheData>,
      ),
      JornadasCacheData,
      PrefetchHooks Function()
    >;
typedef $$AsistenciasLocalesTableCreateCompanionBuilder =
    AsistenciasLocalesCompanion Function({
      required String id,
      required String estudianteId,
      required String jornadaId,
      required String estado,
      required DateTime fechaHoraRegistro,
      Value<bool> sincronizado,
      Value<int> rowid,
    });
typedef $$AsistenciasLocalesTableUpdateCompanionBuilder =
    AsistenciasLocalesCompanion Function({
      Value<String> id,
      Value<String> estudianteId,
      Value<String> jornadaId,
      Value<String> estado,
      Value<DateTime> fechaHoraRegistro,
      Value<bool> sincronizado,
      Value<int> rowid,
    });

class $$AsistenciasLocalesTableFilterComposer
    extends Composer<_$LocalDatabase, $AsistenciasLocalesTable> {
  $$AsistenciasLocalesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get estudianteId => $composableBuilder(
    column: $table.estudianteId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get jornadaId => $composableBuilder(
    column: $table.jornadaId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get estado => $composableBuilder(
    column: $table.estado,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get fechaHoraRegistro => $composableBuilder(
    column: $table.fechaHoraRegistro,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get sincronizado => $composableBuilder(
    column: $table.sincronizado,
    builder: (column) => ColumnFilters(column),
  );
}

class $$AsistenciasLocalesTableOrderingComposer
    extends Composer<_$LocalDatabase, $AsistenciasLocalesTable> {
  $$AsistenciasLocalesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get estudianteId => $composableBuilder(
    column: $table.estudianteId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get jornadaId => $composableBuilder(
    column: $table.jornadaId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get estado => $composableBuilder(
    column: $table.estado,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get fechaHoraRegistro => $composableBuilder(
    column: $table.fechaHoraRegistro,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get sincronizado => $composableBuilder(
    column: $table.sincronizado,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$AsistenciasLocalesTableAnnotationComposer
    extends Composer<_$LocalDatabase, $AsistenciasLocalesTable> {
  $$AsistenciasLocalesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get estudianteId => $composableBuilder(
    column: $table.estudianteId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get jornadaId =>
      $composableBuilder(column: $table.jornadaId, builder: (column) => column);

  GeneratedColumn<String> get estado =>
      $composableBuilder(column: $table.estado, builder: (column) => column);

  GeneratedColumn<DateTime> get fechaHoraRegistro => $composableBuilder(
    column: $table.fechaHoraRegistro,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get sincronizado => $composableBuilder(
    column: $table.sincronizado,
    builder: (column) => column,
  );
}

class $$AsistenciasLocalesTableTableManager
    extends
        RootTableManager<
          _$LocalDatabase,
          $AsistenciasLocalesTable,
          AsistenciasLocale,
          $$AsistenciasLocalesTableFilterComposer,
          $$AsistenciasLocalesTableOrderingComposer,
          $$AsistenciasLocalesTableAnnotationComposer,
          $$AsistenciasLocalesTableCreateCompanionBuilder,
          $$AsistenciasLocalesTableUpdateCompanionBuilder,
          (
            AsistenciasLocale,
            BaseReferences<
              _$LocalDatabase,
              $AsistenciasLocalesTable,
              AsistenciasLocale
            >,
          ),
          AsistenciasLocale,
          PrefetchHooks Function()
        > {
  $$AsistenciasLocalesTableTableManager(
    _$LocalDatabase db,
    $AsistenciasLocalesTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$AsistenciasLocalesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$AsistenciasLocalesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$AsistenciasLocalesTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> estudianteId = const Value.absent(),
                Value<String> jornadaId = const Value.absent(),
                Value<String> estado = const Value.absent(),
                Value<DateTime> fechaHoraRegistro = const Value.absent(),
                Value<bool> sincronizado = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => AsistenciasLocalesCompanion(
                id: id,
                estudianteId: estudianteId,
                jornadaId: jornadaId,
                estado: estado,
                fechaHoraRegistro: fechaHoraRegistro,
                sincronizado: sincronizado,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String estudianteId,
                required String jornadaId,
                required String estado,
                required DateTime fechaHoraRegistro,
                Value<bool> sincronizado = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => AsistenciasLocalesCompanion.insert(
                id: id,
                estudianteId: estudianteId,
                jornadaId: jornadaId,
                estado: estado,
                fechaHoraRegistro: fechaHoraRegistro,
                sincronizado: sincronizado,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$AsistenciasLocalesTable, AsistenciasLocale>(
                    table,
                  ),
                  BaseReferences<
                    _$LocalDatabase,
                    $AsistenciasLocalesTable,
                    AsistenciasLocale
                  >(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$AsistenciasLocalesTableProcessedTableManager =
    ProcessedTableManager<
      _$LocalDatabase,
      $AsistenciasLocalesTable,
      AsistenciasLocale,
      $$AsistenciasLocalesTableFilterComposer,
      $$AsistenciasLocalesTableOrderingComposer,
      $$AsistenciasLocalesTableAnnotationComposer,
      $$AsistenciasLocalesTableCreateCompanionBuilder,
      $$AsistenciasLocalesTableUpdateCompanionBuilder,
      (
        AsistenciasLocale,
        BaseReferences<
          _$LocalDatabase,
          $AsistenciasLocalesTable,
          AsistenciasLocale
        >,
      ),
      AsistenciasLocale,
      PrefetchHooks Function()
    >;
typedef $$ColaSincronizacionLocalTableCreateCompanionBuilder =
    ColaSincronizacionLocalCompanion Function({
      Value<int> id,
      required String entidad,
      required String entidadId,
      required String payload,
      Value<int> intentos,
      Value<DateTime> creadoEn,
    });
typedef $$ColaSincronizacionLocalTableUpdateCompanionBuilder =
    ColaSincronizacionLocalCompanion Function({
      Value<int> id,
      Value<String> entidad,
      Value<String> entidadId,
      Value<String> payload,
      Value<int> intentos,
      Value<DateTime> creadoEn,
    });

class $$ColaSincronizacionLocalTableFilterComposer
    extends Composer<_$LocalDatabase, $ColaSincronizacionLocalTable> {
  $$ColaSincronizacionLocalTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get entidad => $composableBuilder(
    column: $table.entidad,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get entidadId => $composableBuilder(
    column: $table.entidadId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get intentos => $composableBuilder(
    column: $table.intentos,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get creadoEn => $composableBuilder(
    column: $table.creadoEn,
    builder: (column) => ColumnFilters(column),
  );
}

class $$ColaSincronizacionLocalTableOrderingComposer
    extends Composer<_$LocalDatabase, $ColaSincronizacionLocalTable> {
  $$ColaSincronizacionLocalTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get entidad => $composableBuilder(
    column: $table.entidad,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get entidadId => $composableBuilder(
    column: $table.entidadId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get intentos => $composableBuilder(
    column: $table.intentos,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get creadoEn => $composableBuilder(
    column: $table.creadoEn,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$ColaSincronizacionLocalTableAnnotationComposer
    extends Composer<_$LocalDatabase, $ColaSincronizacionLocalTable> {
  $$ColaSincronizacionLocalTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get entidad =>
      $composableBuilder(column: $table.entidad, builder: (column) => column);

  GeneratedColumn<String> get entidadId =>
      $composableBuilder(column: $table.entidadId, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<int> get intentos =>
      $composableBuilder(column: $table.intentos, builder: (column) => column);

  GeneratedColumn<DateTime> get creadoEn =>
      $composableBuilder(column: $table.creadoEn, builder: (column) => column);
}

class $$ColaSincronizacionLocalTableTableManager
    extends
        RootTableManager<
          _$LocalDatabase,
          $ColaSincronizacionLocalTable,
          ColaSincronizacionLocalData,
          $$ColaSincronizacionLocalTableFilterComposer,
          $$ColaSincronizacionLocalTableOrderingComposer,
          $$ColaSincronizacionLocalTableAnnotationComposer,
          $$ColaSincronizacionLocalTableCreateCompanionBuilder,
          $$ColaSincronizacionLocalTableUpdateCompanionBuilder,
          (
            ColaSincronizacionLocalData,
            BaseReferences<
              _$LocalDatabase,
              $ColaSincronizacionLocalTable,
              ColaSincronizacionLocalData
            >,
          ),
          ColaSincronizacionLocalData,
          PrefetchHooks Function()
        > {
  $$ColaSincronizacionLocalTableTableManager(
    _$LocalDatabase db,
    $ColaSincronizacionLocalTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ColaSincronizacionLocalTableFilterComposer(
                $db: db,
                $table: table,
              ),
          createOrderingComposer: () =>
              $$ColaSincronizacionLocalTableOrderingComposer(
                $db: db,
                $table: table,
              ),
          createComputedFieldComposer: () =>
              $$ColaSincronizacionLocalTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> entidad = const Value.absent(),
                Value<String> entidadId = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<int> intentos = const Value.absent(),
                Value<DateTime> creadoEn = const Value.absent(),
              }) => ColaSincronizacionLocalCompanion(
                id: id,
                entidad: entidad,
                entidadId: entidadId,
                payload: payload,
                intentos: intentos,
                creadoEn: creadoEn,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String entidad,
                required String entidadId,
                required String payload,
                Value<int> intentos = const Value.absent(),
                Value<DateTime> creadoEn = const Value.absent(),
              }) => ColaSincronizacionLocalCompanion.insert(
                id: id,
                entidad: entidad,
                entidadId: entidadId,
                payload: payload,
                intentos: intentos,
                creadoEn: creadoEn,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<
                    $ColaSincronizacionLocalTable,
                    ColaSincronizacionLocalData
                  >(table),
                  BaseReferences<
                    _$LocalDatabase,
                    $ColaSincronizacionLocalTable,
                    ColaSincronizacionLocalData
                  >(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$ColaSincronizacionLocalTableProcessedTableManager =
    ProcessedTableManager<
      _$LocalDatabase,
      $ColaSincronizacionLocalTable,
      ColaSincronizacionLocalData,
      $$ColaSincronizacionLocalTableFilterComposer,
      $$ColaSincronizacionLocalTableOrderingComposer,
      $$ColaSincronizacionLocalTableAnnotationComposer,
      $$ColaSincronizacionLocalTableCreateCompanionBuilder,
      $$ColaSincronizacionLocalTableUpdateCompanionBuilder,
      (
        ColaSincronizacionLocalData,
        BaseReferences<
          _$LocalDatabase,
          $ColaSincronizacionLocalTable,
          ColaSincronizacionLocalData
        >,
      ),
      ColaSincronizacionLocalData,
      PrefetchHooks Function()
    >;

class $LocalDatabaseManager {
  final _$LocalDatabase _db;
  $LocalDatabaseManager(this._db);
  $$EstudiantesCacheTableTableManager get estudiantesCache =>
      $$EstudiantesCacheTableTableManager(_db, _db.estudiantesCache);
  $$JornadasCacheTableTableManager get jornadasCache =>
      $$JornadasCacheTableTableManager(_db, _db.jornadasCache);
  $$AsistenciasLocalesTableTableManager get asistenciasLocales =>
      $$AsistenciasLocalesTableTableManager(_db, _db.asistenciasLocales);
  $$ColaSincronizacionLocalTableTableManager get colaSincronizacionLocal =>
      $$ColaSincronizacionLocalTableTableManager(
        _db,
        _db.colaSincronizacionLocal,
      );
}
