# AGENTS.md

Libro de reclamaciones Virtual. Backend Go + frontend React/Vite.

### Carpetas

| Carpeta | Qué es |
| --- | --- |
| `apps/api` | Backend Go: dominio, base de datos, RPC, API pública y MCP |
| `apps/web` | Frontend React + Vite |
| `packages/contracts` | Archivos `.proto`, fuente de los contratos |
| `packages/rpc-client` | Cliente TypeScript generado desde los `.proto` |

### Comandos

Ejecutar siempre desde la raíz.

| Comando | Para qué sirve |
| --- | --- |
| `bun run dev:api` / `bun run dev:web` | Levantar el backend (`:8080`) y el frontend (`:5173`), cada uno en su terminal |
| `bun run db:migrate` / `bun run db:seed` | Aplicar migraciones y cargar países y ubigeos |
| `bun run generate` | Regenerar código Go y TS desde los `.proto`, y las constantes públicas |
| `bun run build` | Compilar el frontend, embeberlo y generar el binario único en `dist/open-reclamos` (`RELEASE_VERSION` define la versión) |
| `bun run format` | Biome (TS/CSS) y golines/gofmt (Go) |
| `bun run check` | Lint de Biome, tipos de TypeScript y `go vet` |
| `bun run test:api` / `bun run test:web` | Tests de Go y tests de la web (Bun) |

## 2. Arquitectura

### Backend (`apps/api`)

```text
cmd/open-reclamos/      CLI y arranque
internal/app/           arma el servidor, el HTTP y los workers
internal/shared/        código común
internal/modules/<m>/   un módulo por dominio
migrations/             migraciones versionadas en Go
gen/                    código generado
tools/webconstants/     genera las constantes TS desde Go
```

- **`internal/shared`:** auth, audit, captcha, config, constants, database (models, repository, seeds), errors, jobs (River), mailer, operation (registro de operaciones), pagination, pdf, server, storage y utils.
- **Módulos:** catalogs, complaints, identity, integrations, organizations y system.
- **Estructura de un módulo:**
  - `module.go`: registra sus RPC, HTTP y workers.
  - `rpc/`: rutas de sus operaciones.
  - `feature/<caso>/`: la lógica, un archivo por acción.
  - Solo si hacen falta: `handler/` (HTTP: uploads, descargas, exportaciones), `entity/` y `utils/`.
- **Operaciones:** cada una se registra en `operation.Registry` con su acceso (`Public`, `Global` o `Tenant` + permiso). Connect, la API Huma y MCP comparten ese registro.
- **Dependencias:** un módulo no importa features de otro, salvo dependencias explícitas en su `module.go`.

### Frontend (`apps/web/src`)

```text
app/       composición: router, rutas, páginas por URL, layouts y guards
modules/   un dominio por carpeta: catalogs, complaints, identity, integrations, organizations
shared/    infraestructura reutilizable
```

- **`app/`:**
  - `router.ts`: un solo `createBrowserRouter` (React Router Data Mode).
  - `routes.ts`: rutas declaradas a mano.
  - `pages/<url>/page.tsx`: reexporta la pantalla con import lazy (`[param]` para segmentos dinámicos).
  - `layouts/` y `routing/`: layouts, guards y retorno seguro.
- **`modules/<dominio>`:**
  - `pages/<pantalla>-page.tsx`: carga datos y compone `features/`.
  - `features/<interacción>/`: piezas que no dependen de una página concreta.
  - `components/`, `hooks/` y la API (`api.ts` o `api/`) con sus tipos y validación.
  - Dejar junto a la pantalla lo que cambia junto; subirlo al módulo cuando tenga varios consumidores.
- **`shared/`:** `api/` (cliente Connect), `auth/` (access en memoria, refresh y sesión), `config/`, `components/` (`ui/` shadcn, `forms/`, `feedback/`, `theme/`), `hooks/` (`useForm`, `useDataTable`), `stores/` (Zustand), `lib/` y `constants/`. No importa de `modules/` ni de `app/`.
- **Datos:** `loader` para entrar a una ruta; `fetcher` o hooks para interacciones dentro de ella. Cada dato tiene un solo dueño de carga.
- **Estado:** la URL para filtros y páginas, estado local para inputs, Zustand solo para feedback global.

### Detalles técnicos

- **RPC:** un envelope compartido `{id, data, page, pageSize, filters}`. `data` y `filters` van en snake_case y son `Struct`; Go valida cada operación. Los importes son strings decimales.
- **Autenticación:** el access JWT dura 10 minutos, se guarda solo en memoria y se envía como `Authorization: Bearer`. El refresh vive en una cookie HttpOnly. El cliente renueva una sola vez ante `Unauthenticated` y comparte la renovación entre solicitudes simultáneas.
- **Migraciones:** cada una trae sus propias structs congeladas y nunca se edita una publicada. `db:migrate` aplica también las de River; `serve` verifica el esquema pero no migra.
- **Repositorio:** los servicios no arman SQL. Las diferencias entre SQLite y PostgreSQL están aisladas en `repository/dialect.go`. `deps.Transaction` comparte una transacción entre escrituras, auditoría, historial y jobs. IDs en UUIDv7 y fechas en UTC.
- **Frontend servido por Go:** el build de Vite se copia a `internal/shared/assets/web` y se embebe con `go:embed`; sin build, un archivo de respaldo permite `go run`. Las rutas de React Router las responde Go con el HTML.
- **Configuración pública:** la UI lee `/api/config` en runtime. Los secretos nunca salen de Go.
- **Tests de Go:** corren sobre una base nueva por prueba: SQLite siempre, y PostgreSQL cuando `TEST_DATABASE_URL` está definida.

## 3. Reglas

### Estilo de código

- **Idioma:** código, SQL y rutas en inglés; comentarios y textos de UI en español.
- **Formato:** Biome para TS/CSS y gofmt para Go.
- **Legibilidad:** separar con una línea en blanco cada paso lógico (declaraciones, listeners, llamadas, validaciones, retornos) y usar siempre llaves en `if`/`for`/`while`, aunque tengan una sola sentencia. Nada de `if (x) hacer()` en una línea ni bloques apiñados.
- **Comentarios:** cortos, sencillos y nada formales, como los escribiría un estudiante. En español, todo en minúscula y con palabras fáciles. Solo los necesarios: una función larga, un paso raro o algo hecho a propósito. Ejemplo: `// va juntando palabras hasta que la línea se llena`.
- **Archivos generados:** no se editan (`apps/api/gen`, `packages/rpc-client/src/gen`). Se regeneran con `bun run generate`.
