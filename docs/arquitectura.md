# SIGPAE — Decisiones de arquitectura

## Stack
- **Backend:** Node.js + Express + TypeScript, PostgreSQL 17 vía Prisma 7.10.0 (ORM) + `pg` (driver).
- **Cliente:** Flutter (Android, Web, Windows desktop) — un solo código para los tres destinos.
- **Base local (offline):** SQLite embebido en el dispositivo (`drift`), se agrega cuando empiece la Fase 11.

## Base de datos (Fase 2)
- PostgreSQL 17 corriendo localmente como servicio de Windows (ya estaba instalado). Base `sigpae_dev`, rol dedicado `sigpae_app` (no se usa el superusuario `postgres` desde la app).
- **Prisma 7.10.0 fijado explícitamente** (no `^7` ni `latest`): al momento de esta fase, el dist-tag `latest` de `prisma` en npm apuntaba a `8.0.0-rc.19`, una release candidate que trae una función nueva ("Composer") con un árbol de dependencias enorme y ajeno a un ORM (herramientas de despliegue multi-nube, SDKs de AWS). Es legítimo (viene de `registry.npmjs.org`, no es un paquete secuestrado) pero no aporta nada a SIGPAE y añade superficie de ataque y peso innecesarios. Se fijó la última estable (`7.10.0`, dist-tag `prev`) tanto para `prisma` como `@prisma/client`. Revisar este pin conscientemente cuando Prisma publique una v8 estable.
- **Prisma 7 cambia dónde vive la configuración de conexión**: la URL ya no va en `schema.prisma` (bloque `datasource`), sino en `prisma.config.ts` (`backend/prisma.config.ts`). El `PrismaClient` en tiempo de ejecución requiere un *driver adapter* explícito (`@prisma/adapter-pg` + `pg`), ver `backend/src/config/prisma.ts`.
- 4 vulnerabilidades "high" quedan sin resolver en `npm audit`: son del driver `mysql2` (que Prisma incluye siempre aunque no lo usemos, ya que solo trabajamos con Postgres) y de `deepmerge-ts` (dependencia interna del cargador de configuración de Prisma, solo se ejecuta en tiempo de desarrollo/CLI). Ninguna es alcanzable desde la app en producción; forzar el arreglo (`npm audit fix --force`) degradaría Prisma a 6.x sin necesidad real. Revisar en cada fase si ya hay parche disponible.
- Modelo completo (30 tablas) definido en `backend/prisma/schema.prisma`, migración inicial en `backend/prisma/migrations/`. Sigue el diseño de entidades acordado en la Fase 0.
- Decisión de tipos de ID: entidades maestras administradas centralmente y en línea (zonas, instituciones, sedes, grados, grupos, roles, permisos, catálogo de dispositivos) usan enteros autoincrementales. Entidades que pueden crearse **sin conexión, en el dispositivo** (estudiantes provisionales, asistencia, entregas, novedades, jornadas, cola de sincronización, auditoría, etc.) usan UUID generado por el cliente, para evitar colisiones antes de sincronizar con el servidor.

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
