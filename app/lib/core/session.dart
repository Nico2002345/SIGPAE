class Usuario {
  Usuario({
    required this.id,
    required this.nombreCompleto,
    required this.rol,
    required this.permisos,
  });

  factory Usuario.fromJson(Map<String, dynamic> json) => Usuario(
        id: json['id'] as String,
        nombreCompleto: json['nombreCompleto'] as String,
        rol: json['rol'] as String,
        permisos: List<String>.from(json['permisos'] as List),
      );

  final String id;
  final String nombreCompleto;
  final String rol;
  final List<String> permisos;
}

class Sesion {
  Sesion({required this.accessToken, required this.refreshToken, required this.usuario});

  final String accessToken;
  final String refreshToken;
  final Usuario usuario;
}
