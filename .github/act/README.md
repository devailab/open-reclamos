# Pruebas locales con act

Ejecutar desde la raíz, con Docker encendido y `act` instalado.

CI:

```bash
act push
```

Release (compila ambas arquitecturas sin publicar):

```bash
act release -W .github/workflows/release.yml -e .github/act/release.json --env-file /dev/null --secret-file /dev/null
```
