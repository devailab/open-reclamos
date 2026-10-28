package documents

import (
	"bytes"
	"errors"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"math"
	"strings"
	"unicode/utf8"

	"github.com/johnfercher/go-tree/node"
	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/page"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/extension"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontfamily"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/core/entity"
	"github.com/johnfercher/maroto/v2/pkg/props"
	"github.com/phpdave11/gofpdf"
	"golang.org/x/image/font/gofont/gobold"
	"golang.org/x/image/font/gofont/goregular"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/pdf"
)

// Medidas en puntos como la plantilla React-PDF original; Maroto usa mm.
const receiptMM = 25.4 / 72
const receiptWidth = 210/receiptMM - 44
const receiptPageHeight = 297/receiptMM - 22 - 20 - .05

// React-PDF hereda este lineHeight desde Page, incluso en labels más pequeños.
const receiptInheritedLineHeight = 11.05

var receiptInk = color.RGBA{17, 24, 39, 255}
var receiptSlate = color.RGBA{55, 65, 81, 255}
var receiptMuted = color.RGBA{107, 114, 128, 255}
var receiptLight = color.RGBA{156, 163, 175, 255}
var receiptBorder = color.RGBA{209, 213, 219, 255}
var receiptGray = color.RGBA{243, 244, 246, 255}
var receiptGreen = color.RGBA{22, 101, 52, 255}
var receiptGreenBorder = color.RGBA{134, 239, 172, 255}
var receiptGreenBackground = color.RGBA{220, 252, 231, 255}

// un texto con su posición y tamaño en la hoja
type receiptText struct {
	X, Y, Width    float64
	Size, Tracking float64
	Value, Family  string
	Bold           bool
	Color          color.RGBA
	Align          align.Type
}

// un cuadro con color de fondo y borde (los dos son opcionales)
type receiptBox struct {
	X, Y, Width, Height, Radius, Thickness float64
	Fill, Border                           color.RGBA
}

// una página del recibo, con sus textos y cuadros
type receiptCanvas struct {
	Height float64
	Texts  []receiptText
	Boxes  []receiptBox
	Meter  *receiptMeter
}

func (c *receiptCanvas) SetConfig(_ *entity.Config) {}

func (c *receiptCanvas) GetStructure() *node.Node[core.Structure] {
	return node.New(core.Structure{Type: "receipt-template"})
}

func (c *receiptCanvas) GetHeight(_ core.Provider, _ *entity.Cell) float64 {
	return c.Height * receiptMM
}

// primero dibuja los cuadros como una imagen y encima pone los textos
func (c *receiptCanvas) Render(provider core.Provider, cell *entity.Cell) {
	if len(c.Boxes) > 0 {
		background, err := c.background()
		if err != nil {
			panic(err)
		}

		provider.AddImageFromBytes(background, cell, &props.Rect{Percent: 100}, extension.Png)
	}

	for _, text := range c.Texts {
		style := fontstyle.Normal

		if text.Bold {
			style = fontstyle.Bold
		}

		prop := props.Text{
			Family: text.Family,
			Size:   text.Size,
			Style:  style,
			Align:  text.Align,
			Color:  &props.Color{Red: int(text.Color.R), Green: int(text.Color.G), Blue: int(text.Color.B)},
		}

		target := entity.Cell{
			X:      cell.X + text.X*receiptMM,
			Y:      cell.Y + text.Y*receiptMM,
			Width:  text.Width * receiptMM,
			Height: text.Size * 2 * receiptMM,
		}

		if text.Tracking == 0 {
			provider.AddText(text.Value, &target, &prop)

			continue
		}

		// Maroto no expone letterSpacing: dibujar cada glifo conserva el tracking original.
		x := target.X
		trackedWidth := (c.Meter.width(text.Value, text.Size, text.Bold, text.Family) + float64(utf8.RuneCountInString(text.Value)-1)*text.Tracking) * receiptMM

		// mueve el texto según esté a la izquierda, al centro o a la derecha
		if text.Align == align.Right {
			x += target.Width - trackedWidth
		} else if text.Align == align.Center {
			x += (target.Width - trackedWidth) / 2
		}

		prop.Align = align.Left

		for _, r := range text.Value {
			glyph := string(r)
			width := c.Meter.width(glyph, text.Size, text.Bold, text.Family) * receiptMM
			glyphCell := target
			glyphCell.X = x
			glyphCell.Width = width + 1

			provider.AddText(glyph, &glyphCell, &prop)

			x += width + text.Tracking*receiptMM
		}
	}
}

// dibuja los cuadros en una imagen grande para que las esquinas redondas se vean bien
func (c *receiptCanvas) background() ([]byte, error) {
	const scale = 4.0
	width, height := int(math.Ceil(receiptWidth*scale)), int(math.Ceil(c.Height*scale))
	bitmap := image.NewRGBA(image.Rect(0, 0, width, height))

	draw.Draw(bitmap, bitmap.Bounds(), image.NewUniform(color.White), image.Point{}, draw.Src)

	for _, box := range c.Boxes {
		outer := image.Rect(
			int(math.Round(box.X*scale)),
			int(math.Round(box.Y*scale)),
			int(math.Round((box.X+box.Width)*scale)),
			int(math.Round((box.Y+box.Height)*scale)),
		)

		if box.Border.A > 0 {
			paintReceiptRectangle(bitmap, outer, box.Radius*scale, box.Border)

			inset := int(math.Round(box.Thickness * scale))

			if box.Fill.A > 0 {
				paintReceiptRectangle(bitmap, outer.Inset(inset), max(0, box.Radius*scale-float64(inset)), box.Fill)
			}
		} else if box.Fill.A > 0 {
			paintReceiptRectangle(bitmap, outer, box.Radius*scale, box.Fill)
		}
	}

	var encoded bytes.Buffer

	if err := png.Encode(&encoded, bitmap); err != nil {
		return nil, err
	}

	return encoded.Bytes(), nil
}

// pinta un rectángulo; si tiene esquinas redondas, no pinta lo que queda fuera
func paintReceiptRectangle(bitmap *image.RGBA, rect image.Rectangle, radius float64, fill color.RGBA) {
	if radius <= 0 {
		draw.Draw(bitmap, rect, image.NewUniform(fill), image.Point{}, draw.Src)

		return
	}

	for y := rect.Min.Y; y < rect.Max.Y; y++ {
		for x := rect.Min.X; x < rect.Max.X; x++ {
			dx, dy := max(
				float64(rect.Min.X)+radius-(float64(x)+.5),
				0,
				(float64(x)+.5)-(float64(rect.Max.X)-radius),
			), max(
				float64(rect.Min.Y)+radius-(float64(y)+.5),
				0,
				(float64(y)+.5)-(float64(rect.Max.Y)-radius),
			)
			if dx*dx+dy*dy <= radius*radius {
				bitmap.SetRGBA(x, y, fill)
			}
		}
	}
}

// sirve para saber cuánto mide un texto
type receiptMeter struct {
	PDF       *gofpdf.Fpdf
	Translate func(string) string
}

func newReceiptMeter() *receiptMeter {
	meter := gofpdf.New("P", "pt", "A4", "")

	meter.AddUTF8FontFromBytes("Go", "", goregular.TTF)
	meter.AddUTF8FontFromBytes("Go", "B", gobold.TTF)

	return &receiptMeter{PDF: meter, Translate: meter.UnicodeTranslatorFromDescriptor("")}
}

// si el texto tiene letras raras, usa otra fuente
func receiptFont(value string) string {
	for _, r := range value {
		if r > 255 && !strings.ContainsRune("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ", r) {
			return "Go"
		}
	}

	return fontfamily.Helvetica
}

func (m *receiptMeter) width(value string, size float64, bold bool, family string) float64 {
	style := ""

	if bold {
		style = "B"
	}

	m.PDF.SetFont(family, style, size)

	if family == fontfamily.Helvetica {
		value = m.Translate(value)
	}

	return m.PDF.GetStringWidth(value)
}

// corta el texto en líneas para que entren en el ancho
func (m *receiptMeter) wrap(value string, width, size float64, bold bool) []string {
	family := receiptFont(value)
	lines := []string{}

	for _, paragraph := range strings.Split(strings.ReplaceAll(value, "\r\n", "\n"), "\n") {
		if strings.TrimSpace(paragraph) == "" {
			lines = append(lines, "")

			continue
		}

		if m.width(paragraph, size, bold, family) <= width {
			lines = append(lines, paragraph)

			continue
		}

		line := ""

		// va juntando palabras hasta que la línea se llena
		for _, word := range strings.Fields(paragraph) {
			candidate := word

			if line != "" {
				candidate = line + " " + word
			}

			if m.width(candidate, size, bold, family) <= width {
				line = candidate

				continue
			}

			if line != "" {
				lines = append(lines, line)
				line = ""
			}

			// si una palabra sola no cabe, la corta letra por letra
			for _, r := range word {
				if line != "" && m.width(line+string(r), size, bold, family) > width {
					lines = append(lines, line)
					line = ""
				}

				line += string(r)
			}
		}

		if line != "" {
			lines = append(lines, line)
		}
	}

	if len(lines) == 0 {
		return []string{""}
	}

	return lines
}

// va poniendo cada parte de arriba hacia abajo y crea otra página si no hay espacio
type receiptLayout struct {
	Pages   []*receiptCanvas
	Current *receiptCanvas
	Y       float64
	Data    receiptDocument
	Meter   *receiptMeter
}

// crea una página nueva y le pone el encabezado
func (l *receiptLayout) newPage() {
	canvas := &receiptCanvas{Meter: l.Meter}
	l.Pages = append(l.Pages, canvas)
	l.Current = canvas
	l.Y = 0

	l.header()
}

func (l *receiptLayout) text(
	x, y, width, size float64,
	value string,
	bold bool,
	ink color.RGBA,
	tracking float64,
	alignment align.Type,
) {
	l.Current.Texts = append(
		l.Current.Texts,
		receiptText{
			X:        x,
			Y:        y,
			Width:    width,
			Size:     size,
			Value:    value,
			Bold:     bold,
			Color:    ink,
			Tracking: tracking,
			Align:    alignment,
			Family:   receiptFont(value),
		},
	)
}

func (l *receiptLayout) paragraph(x, y, width, size, lineHeight float64, lines []string, bold bool, ink color.RGBA) {
	for index, line := range lines {
		l.text(x, y+float64(index)*lineHeight, width, size, line, bold, ink, 0, align.Left)
	}
}

func (l *receiptLayout) box(x, y, width, height float64, fill, border color.RGBA, radius, thickness float64) {
	l.Current.Boxes = append(
		l.Current.Boxes,
		receiptBox{
			X:         x,
			Y:         y,
			Width:     width,
			Height:    height,
			Fill:      fill,
			Border:    border,
			Radius:    radius,
			Thickness: thickness,
		},
	)
}

// encabezado: título, número, datos del proveedor y 4 datos más
func (l *receiptLayout) header() {
	l.text(0, 0, receiptWidth-110, 6.5, "LIBRO DE RECLAMACIONES VIRTUAL", true, receiptLight, .8, align.Left)
	l.text(0, 10, receiptWidth-110, 14, l.Data.Title, true, receiptInk, 0, align.Left)
	l.text(receiptWidth-95, 0, 95, 6.2, "N.° CORRELATIVO", true, receiptMuted, .5, align.Right)
	l.text(receiptWidth-95, 10, 95, 14, l.Data.Correlative, true, receiptInk, 0, align.Right)
	l.box(0, 30, receiptWidth, 2, receiptSlate, color.RGBA{}, 0, 0)

	orgLines := l.Meter.wrap(l.Data.OrganizationLine, receiptWidth, 8, false)

	l.paragraph(0, 38, receiptWidth, 8, 10.4, orgLines, false, receiptSlate)

	metaTop := 38 + float64(len(orgLines))*10.4 + 5
	metaHeight := 32.0

	for _, field := range l.Data.Metadata {
		metaHeight = max(metaHeight, 16+float64(len(l.Meter.wrap(field.Value, receiptWidth/4-12, 8, true)))*10.4+5)
	}

	l.box(0, metaTop, receiptWidth, 1, receiptBorder, color.RGBA{}, 0, 0)
	l.box(0, metaTop+metaHeight-1, receiptWidth, 1, receiptBorder, color.RGBA{}, 0, 0)

	for index, field := range l.Data.Metadata {
		x := float64(index) * receiptWidth / 4

		if index > 0 {
			l.box(x, metaTop, 1, metaHeight, receiptBorder, color.RGBA{}, 0, 0)
		}

		l.text(x+6, metaTop+4, receiptWidth/4-12, 5.8, strings.ToUpper(field.Label), true, receiptLight, .4, align.Left)

		l.paragraph(
			x+6,
			metaTop+16,
			receiptWidth/4-12,
			8,
			10.4,
			l.Meter.wrap(field.Value, receiptWidth/4-12, 8, true),
			true,
			receiptInk,
		)
	}

	l.Y = metaTop + metaHeight + 8
}

// barra con el título de cada sección (verde si es la respuesta)
func (l *receiptLayout) title(x, y, width float64, title string, response bool) float64 {
	fill, border, ink := receiptGray, receiptBorder, receiptSlate

	if response {
		fill, border, ink = receiptGreenBackground, receiptGreenBorder, receiptGreen
	}

	const height = 16.0

	l.box(x+1, y+1, width-2, height-1, fill, color.RGBA{}, 0, 0)
	l.box(x, y+height, width, 1, border, color.RGBA{}, 0, 0)
	l.text(x+7, y+4, width-14, 7, strings.ToUpper(title), true, ink, .5, align.Left)

	return height + 1
}

func (l *receiptLayout) fieldHeight(field receiptField, width float64) float64 {
	return receiptInheritedLineHeight + 1 + float64(
		len(l.Meter.wrap(field.Value, width-14, 8.2, field.Strong)),
	)*receiptInheritedLineHeight
}

// calcula cuánto mide un panel: el título más todos sus campos
func (l *receiptLayout) panelHeight(fields []receiptField, width float64) float64 {
	height := 17.0 + 10

	for index, field := range fields {
		height += l.fieldHeight(field, width)

		if index < len(fields)-1 {
			height += 4
		}
	}

	return height
}

// dibuja un panel con su título y sus campos
func (l *receiptLayout) panel(x, y, width float64, title string, fields []receiptField) float64 {
	height := l.panelHeight(fields, width)

	l.box(x, y, width, height, color.RGBA{255, 255, 255, 255}, receiptBorder, 2, 1)

	cursor := y + l.title(x, y, width, title, false) + 5

	for index, field := range fields {
		l.text(x+7, cursor, width-14, 6, strings.ToUpper(field.Label), true, receiptMuted, .4, align.Left)

		cursor += receiptInheritedLineHeight + 1
		lines := l.Meter.wrap(field.Value, width-14, 8.2, field.Strong)

		l.paragraph(x+7, cursor, width-14, 8.2, receiptInheritedLineHeight, lines, field.Strong, receiptInk)

		cursor += float64(len(lines)) * receiptInheritedLineHeight

		if index < len(fields)-1 {
			cursor += 4
		}
	}

	return height
}

// pone proveedor y consumidor a la izquierda, y el bien o servicio a la derecha
func (l *receiptLayout) grid() {
	width := receiptWidth * .49
	left := l.panelHeight(l.Data.Provider, width) + 6 + l.panelHeight(l.Data.Consumer, width)
	right := l.panelHeight(l.Data.Item, width) + 6 + 16
	height := max(left, right)
	if l.Y+height > receiptPageHeight {
		l.newPage()
	}

	y := l.Y
	providerHeight := l.panel(0, y, width, "1. Proveedor", l.Data.Provider)

	l.panel(0, y+providerHeight+6, width, "2. Consumidor reclamante", l.Data.Consumer)

	itemHeight := l.panel(width+6, y, width, "3. Bien o servicio involucrado", l.Data.Item)
	noteY := y + itemHeight + 6

	l.box(width+6, noteY, width, 18, color.RGBA{249, 250, 251, 255}, color.RGBA{229, 231, 235, 255}, 2, 1)
	l.text(width+13, noteY+3, width-14, 7.2, l.Data.Attachments, false, receiptMuted, 0, align.Left)

	l.Y += height + 6
}

// si el texto es largo, usa letra más chica
func narrativeFont(value string) (float64, float64) {
	if len([]rune(value)) > 320 {
		return 7.8, 10.14
	}

	return 8.2, 11.07
}

// pone detalle y pedido en dos columnas y los pasa a otra página si no entran
func (l *receiptLayout) narratives() {
	width := receiptWidth/2 - 14
	leftSize, leftHeight := narrativeFont(l.Data.Detail)
	rightSize, rightHeight := narrativeFont(l.Data.Request)

	left, right := l.Meter.wrap(
		l.Data.Detail,
		width,
		leftSize,
		false,
	), l.Meter.wrap(
		l.Data.Request,
		width,
		rightSize,
		false,
	)

	for a, b := 0, 0; a < len(left) || b < len(right); {
		available := receiptPageHeight - l.Y
		// espacio que siempre se usa: título, etiquetas y márgenes
		const base = 17 + 5 + receiptInheritedLineHeight + 3 + 5
		if available < base+max(leftHeight, rightHeight) {
			l.newPage()

			continue
		}

		// cuenta cuántas líneas entran en lo que queda de la página
		countA := min(len(left)-a, int(math.Floor((available-base)/leftHeight)))
		countB := min(len(right)-b, int(math.Floor((available-base)/rightHeight)))
		height := base + max(float64(countA)*leftHeight, float64(countB)*rightHeight)

		l.box(0, l.Y, receiptWidth, height, color.RGBA{255, 255, 255, 255}, receiptBorder, 2, 1)

		body := l.Y + l.title(0, l.Y, receiptWidth, "4. Detalle y pedido del consumidor", false)

		l.box(receiptWidth/2, body, 1, height-17, receiptBorder, color.RGBA{}, 0, 0)
		l.text(7, body+5, width, 6, "DETALLE", true, receiptMuted, .4, align.Left)
		l.text(receiptWidth/2+7, body+5, width, 6, "PEDIDO DEL CONSUMIDOR", true, receiptMuted, .4, align.Left)

		l.paragraph(
			7,
			body+5+receiptInheritedLineHeight+3,
			width,
			leftSize,
			leftHeight,
			left[a:a+countA],
			false,
			receiptInk,
		)

		l.paragraph(
			receiptWidth/2+7,
			body+5+receiptInheritedLineHeight+3,
			width,
			rightSize,
			rightHeight,
			right[b:b+countB],
			false,
			receiptInk,
		)

		a += countA
		b += countB
		l.Y += height + 6
	}
}

// observaciones del proveedor; si son largas siguen en otra página
func (l *receiptLayout) provider() {
	lines := l.Meter.wrap(l.Data.ProviderContent, receiptWidth-14, 8.2, false)

	for offset := 0; offset < len(lines); {
		const base = 17 + 12
		const lineHeight = 11.07
		if receiptPageHeight-l.Y < base+lineHeight {
			l.newPage()

			continue
		}

		count := min(len(lines)-offset, int(math.Floor((receiptPageHeight-l.Y-base)/lineHeight)))
		height := base + float64(count)*lineHeight
		border, ink := receiptBorder, receiptSlate

		if l.Data.Response {
			border, ink = receiptGreenBorder, receiptGreen
		}

		l.box(0, l.Y, receiptWidth, height, color.RGBA{255, 255, 255, 255}, border, 2, 1)

		body := l.Y + l.title(
			0,
			l.Y,
			receiptWidth,
			"5. Observaciones y acciones adaptadas por el proveedor",
			l.Data.Response,
		)

		l.paragraph(7, body+6, receiptWidth-14, 8.2, lineHeight, lines[offset:offset+count], false, ink)

		offset += count
		l.Y += height + 6
	}
}

// texto legal del final; si no entra, pasa a otra página
func (l *receiptLayout) footer() {
	lines := l.Meter.wrap(l.Data.Footer, receiptWidth-4, 6.5, false)
	height := 10 + float64(len(lines))*8.45
	if l.Y+height > receiptPageHeight {
		l.newPage()
	}

	l.box(0, l.Y+4, receiptWidth, 1, receiptBorder, color.RGBA{}, 0, 0)

	for index, line := range lines {
		l.text(2, l.Y+10+float64(index)*8.45, receiptWidth-4, 6.5, line, false, receiptLight, 0, align.Center)
	}

	l.Y += height
}

// arma el pdf; da error si faltan datos o si una página se pasa del tamaño
func renderReceiptDocument(data receiptDocument) ([]byte, error) {
	if len(data.Metadata) != 4 {
		return nil, errors.New(constants.MsgReceiptMetadataMissing)
	}

	l := receiptLayout{Data: data, Meter: newReceiptMeter()}

	l.newPage()
	l.grid()
	l.narratives()
	l.provider()
	l.footer()

	// todas las páginas miden igual menos la última, que mide solo lo que usó
	for index, canvas := range l.Pages {
		if index < len(l.Pages)-1 {
			canvas.Height = receiptPageHeight
		} else {
			canvas.Height = l.Y
		}

		if canvas.Height > receiptPageHeight+.01 {
			return nil, errors.New(constants.MsgReceiptPageLimit)
		}
	}

	// márgenes iguales a los de la plantilla original
	cfg := config.NewBuilder().WithLeftMargin(22*receiptMM).WithRightMargin(22*receiptMM).
		WithTopMargin(22*receiptMM).WithBottomMargin(20*receiptMM).
		WithCustomFonts([]entity.CustomFont{pdf.RegularFont{}, pdf.BoldFont{}}).
		WithDefaultFont(&props.Font{Family: fontfamily.Helvetica, Size: 8.5}).WithSequentialMode().
		WithTitle(data.Title+" "+data.Correlative, true).
		WithAuthor("Open Reclamos", true).WithSubject(data.Subject, true).Build()

	m := maroto.New(cfg)

	for _, canvas := range l.Pages {
		m.AddPages(page.New().Add(row.New(canvas.Height * receiptMM).Add(col.New(12).Add(canvas))))
	}

	document, err := m.Generate()
	if err != nil {
		return nil, err
	}

	return document.GetBytes(), nil
}
