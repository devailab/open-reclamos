package assets

import (
	"embed"
	"io/fs"
)

// El build copia dist aquí; fallback permite go run antes del primer build web.
//
//go:embed all:web fallback/index.html
var files embed.FS

func Web() fs.FS {
	if _, err := fs.Stat(files, "web/index.html"); err == nil {
		web, _ := fs.Sub(files, "web")

		return web
	}

	fallback, _ := fs.Sub(files, "fallback")

	return fallback
}
