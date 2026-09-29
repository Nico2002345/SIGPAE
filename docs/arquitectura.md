# SIGPAE — Decisiones de arquitectura

## Stack
- **Backend:** Node.js + Express + TypeScript, PostgreSQL vía Prisma (se agrega en Fase 2).
- **Cliente:** Flutter (Android, Web, Windows desktop) — un solo código para los tres destinos.
- **Base local (offline):** SQLite embebido en el dispositivo (`drift`), se agrega cuando empiece la Fase 11.

## Estado del entorno de desarrollo
- Flutter 3.47.5 (stable) instalado en `C:\flutter`, agregado al PATH de usuario.
- Android SDK con cmdline-tools instalado y licencias aceptadas (`ANDROID_HOME`/`ANDROID_SDK_ROOT` configurados).
- Target **Windows desktop** de Flutter queda pendiente: Visual Studio Build Tools está instalado pero incompleto (falta el workload "Desarrollo de escritorio con C++"). No bloquea el desarrollo actual (Android + Web sí funcionan). Se completa cuando haga falta compilar el cliente nativo de Windows.

## Por qué Flutter en vez de PWA o nativo puro
Bluetooth es un requisito duro para la sincronización rural (manipuladora → coordinador sin Internet). Web Bluetooth (PWA) no da soporte confiable para transferencia de lotes de datos, y mantener dos bases de código nativas (Android + Windows) duplicaría el costo de mantenimiento. Flutter cubre los tres destinos desde un solo código con acceso nativo a Bluetooth, cámara/QR y SQLite.

## Estructura de carpetas
```
sigpae/
├── backend/     # Node.js + Express + TypeScript
├── app/         # Flutter — Android / Windows / Web (proyecto Dart: sigpae_app)
└── docs/        # este archivo, modelo de datos, decisiones
```

Ver el resto del modelo de datos, flujo de autenticación, diseño offline-first y de sincronización en la conversación de la Fase 0 (análisis arquitectónico completo). Este archivo se irá ampliando fase a fase con lo que realmente se implemente.
