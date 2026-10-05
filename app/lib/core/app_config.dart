/// URL base del backend. Se fija en tiempo de compilación con
/// `--dart-define=API_BASE_URL=https://...`; sin ese flag cae a localhost
/// (útil solo para emulador/dev).
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );
}
