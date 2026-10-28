// webconstants genera constantes públicas para el cliente React desde sus fuentes Go.
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

func main() {
	if err := generate(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func generate() error {
	values := map[string]string{}

	for _, name := range []string{"messages.go", "permissions.go", "status.go", "operations.go"} {
		file, err := parser.ParseFile(token.NewFileSet(), filepath.Join("internal/shared/constants", name), nil, 0)
		if err != nil {
			return err
		}

		for _, declaration := range file.Decls {
			group, ok := declaration.(*ast.GenDecl)
			if !ok || group.Tok != token.CONST {
				continue
			}

			for _, spec := range group.Specs {
				value := spec.(*ast.ValueSpec)

				for index, identifier := range value.Names {
					// Los prefijos/rutas RPC compuestos no son nombres de operación.
					if name == "operations.go" && !strings.HasPrefix(identifier.Name, "Op") {
						continue
					}

					if index >= len(value.Values) {
						return fmt.Errorf("constante sin valor explícito: %s", identifier.Name)
					}

					literal, ok := value.Values[index].(*ast.BasicLit)
					if !ok || literal.Kind != token.STRING {
						return fmt.Errorf("constante no textual: %s", identifier.Name)
					}

					text, err := strconv.Unquote(literal.Value)
					if err != nil {
						return err
					}

					values[identifier.Name] = text
				}
			}
		}
	}

	names := make([]string, 0, len(values))

	for name := range values {
		names = append(names, name)
	}

	sort.Strings(names)

	var output bytes.Buffer

	output.WriteString("// Generado desde internal/shared/constants. No editar manualmente.\n")

	for _, name := range names {
		value, err := json.Marshal(values[name])
		if err != nil {
			return err
		}

		fmt.Fprintf(&output, "export const %s = %s\n", name, value)
	}

	if len(os.Args) != 2 {
		return fmt.Errorf("uso: webconstants <archivo.ts>")
	}

	return os.WriteFile(os.Args[1], output.Bytes(), 0644)
}
