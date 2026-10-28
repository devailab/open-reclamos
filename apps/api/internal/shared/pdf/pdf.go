// Package pdf contiene fuentes embebidas y utilidades comunes para documentos Maroto.
package pdf

import (
	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	pdftext "github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/core/entity"
	"github.com/johnfercher/maroto/v2/pkg/props"
	"golang.org/x/image/font/gofont/gobold"
	"golang.org/x/image/font/gofont/goregular"
)

// FontFamily es la familia embebida para no depender de fuentes del sistema.
const FontFamily = "Go"

// RegularFont es la fuente Go regular embebida.
type RegularFont struct{}

func (RegularFont) GetFamily() string        { return FontFamily }
func (RegularFont) GetStyle() fontstyle.Type { return fontstyle.Normal }
func (RegularFont) GetFile() string          { return "" }
func (RegularFont) GetBytes() []byte         { return goregular.TTF }

// BoldFont es la fuente Go negrita embebida.
type BoldFont struct{}

func (BoldFont) GetFamily() string        { return FontFamily }
func (BoldFont) GetStyle() fontstyle.Type { return fontstyle.Bold }
func (BoldFont) GetFile() string          { return "" }
func (BoldFont) GetBytes() []byte         { return gobold.TTF }

// New crea un documento simple con la fuente embebida.
func New() *maroto.Maroto {
	cfg := config.NewBuilder().
		WithCustomFonts([]entity.CustomFont{RegularFont{}}).
		WithDefaultFont(&props.Font{Family: FontFamily, Style: fontstyle.Normal, Size: 10}).
		WithLeftMargin(15).
		WithRightMargin(15).
		Build()
	return maroto.New(cfg).(*maroto.Maroto)
}

// Line agrega "label + value" en una fila; omite valores vacíos.
func Line(m *maroto.Maroto, label, value string) {
	if value == "" {
		return
	}
	m.AddAutoRow(col.New(12).Add(pdftext.New(label+value, props.Text{Size: 10, Top: 2, Bottom: 2})))
}
