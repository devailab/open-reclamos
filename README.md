# Open Reclamos

Sistema open source para crear y gestionar **Libros de Reclamaciones Virtual** alineado con las regulaciones de INDECOPI (Perú).

Open Reclamos permite a cualquier empresa implementar un Libro de Reclamaciones Virtual en su sitio web de forma sencilla, cumplir con la normativa del Código de Protección y Defensa del Consumidor, y gestionar los reclamos de sus clientes desde un panel administrativo.

## Desarrollo

### Prerrequisitos

- [Bun](https://bun.sh)
- PostgreSQL
- Servicio de correo SMTP
- Servicio compatible con la API S3 (por ejemplo, MinIO)
- Cuenta en [ApiPeruDev](https://apiperu.dev) con su token de acceso

### Configuración

1. Copia el archivo de variables de entorno y completa los valores:

```bash
cp examples/.env.example .env
```

2. Instala las dependencias y aplica las migraciones:

```bash
bun install
bun run db:migrate
```

3. Levanta el servidor de desarrollo y el worker de Inngest en terminales separadas:

```bash
bun run dev
bun run inngest:dev
```

Y listo la app estará corriendo en [http://localhost:3000](http://localhost:3000).

## Self-hosted

Para facilitar la implementación, Open Reclamos ofrece una configuración _self-hosted_ que incluye todo lo necesario para ejecutar la aplicación. Se recomienda crear una carpeta dedicada antes de ejecutar los indicado en los siguientes pasos.

> Puede ver los archivos de configuración que se usarán, en la carpeta `examples/` de este repositorio.

### 1. Descarga y configura el `.env`

```bash
curl -O https://raw.githubusercontent.com/devailab/open-reclamos/main/examples/.env.example
mv .env.example .env
```

Edita el `.env` con tus valores antes de continuar.

### 2. Descarga el `docker-compose.yml`

```bash
curl -O https://raw.githubusercontent.com/devailab/open-reclamos/main/examples/docker-compose.yml
```

### 3. Levanta los servicios

```bash
docker compose up -d
```

Luego de completar esos pasos, ¡felicidades! 🎉 Open Reclamos estará disponible en http://localhost:3000
. Podrás comenzar registrando tu cuenta y, a partir de ahí, aprovechar todas las funcionalidades que ofrece la plataforma.

## Licencia

[MIT](LICENSE)
