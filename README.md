# Open Reclamos

Sistema open source para crear y gestionar **Libros de Reclamaciones Virtual** alineado con las regulaciones de INDECOPI (Perú).

## ¿Qué es Open Reclamos?

Open Reclamos permite a cualquier empresa implementar un Libro de Reclamaciones Virtual en su sitio web de forma sencilla, cumplir con la normativa del Código de Protección y Defensa del Consumidor, y gestionar los reclamos de sus clientes desde un panel administrativo.

## Tech Stack

- **Framework**: Next.js
- **Base de datos**: PostgreSQL
- **ORM**: Drizzle ORM

## Cómo ejecutar el proyecto

### Prerrequisitos

- [Bun](https://bun.sh/) (runtime de JavaScript)
- PostgreSQL (base de datos)

### Configuración

1. Clona el repositorio
2. Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
```

3. Instala las dependencias:

```bash
bun install
```

4. Genera las migraciones de la base de datos:

```bash
bun run db:generate
```

5. Aplica las migraciones:

```bash
bun run db:migrate
```

### Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `bun run dev` | Iniciar el servidor de desarrollo |
| `bun run build` | Construir para producción |
| `bun run start` | Iniciar el servidor de producción |
| `bun run lint` | Verificar código (Biome) |
| `bun run format` | Formatear código |
| `bun run vitest` | Ejecutar pruebas |
| `bun run db:studio` | Abrir Drizzle Studio (GUI de base de datos) |