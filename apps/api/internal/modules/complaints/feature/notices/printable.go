package notices

import (
	"bytes"
	"context"
	_ "embed"
	stdimage "image"
	"image/png"
	"net/url"
	"strings"
	"sync"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/code"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/image"
	"github.com/johnfercher/maroto/v2/pkg/components/line"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	pdftext "github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/extension"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontfamily"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/consts/orientation"
	"github.com/johnfercher/maroto/v2/pkg/consts/pagesize"
	"github.com/johnfercher/maroto/v2/pkg/core/entity"
	"github.com/johnfercher/maroto/v2/pkg/props"
	"github.com/srwiley/oksvg"
	"github.com/srwiley/rasterx"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/pdf"
	"openreclamos.com/api/internal/shared/utils"
)

//go:embed notice-book.svg
var noticeBookSVG []byte

// prepara la imagen del libro una sola vez para usarla en los avisos
var noticeBookPNG = sync.OnceValues(func() ([]byte, error) {
	icon, err := oksvg.ReadIconStream(bytes.NewReader(noticeBookSVG))
	if err != nil {
		return nil, err
	}

	const width, height = 726, 290
	bitmap := stdimage.NewRGBA(stdimage.Rect(0, 0, width, height))
	scanner := rasterx.NewScannerGV(width, height, bitmap, bitmap.Bounds())

	icon.SetTarget(0, 0, width, height)
	icon.Draw(rasterx.NewDasher(width, height, scanner), 1)

	var encoded bytes.Buffer

	if err = png.Encode(&encoded, bitmap); err != nil {
		return nil, err
	}

	return encoded.Bytes(), nil
})

// Printable genera el aviso A4 obligatorio con QR al libro de la empresa o tienda.
func (f *Feature) Printable(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	direction := utils.Text(in.Data, "orientation")
	if direction == "" {
		direction = "portrait"
	}

	if direction != "portrait" && direction != "landscape" {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidOrientation)
	}

	// el qr apunta al libro de la empresa o al de la tienda elegida
	organization, err := f.deps.Repo.GetOrganization(ctx, p.OrganizationID)
	if err != nil {
		return operation.Output{}, err
	}

	target := f.deps.Config.PublicBaseURL + constants.PathOrganizationBook + organization.Slug

	if storeID := utils.Text(in.Data, "store_id"); storeID != "" {
		if !utils.ValidID(storeID) {
			return operation.Output{}, apperrors.Invalid(constants.MsgInvalidStore)
		}

		if !p.CanStore(storeID) {
			return operation.Output{}, apperrors.Denied()
		}

		store, err := f.deps.Repo.GetStore(
			ctx,
			repository.GetStoreParams{ID: storeID, OrganizationID: p.OrganizationID},
		)
		if err != nil {
			return operation.Output{}, err
		}

		target = f.deps.Config.PublicBaseURL + constants.PathStoreBook + store.Slug
	}

	if custom := utils.Text(in.Data, "qr_url"); custom != "" {
		target = custom
	}

	parsed, err := url.Parse(target)
	if err != nil || len(target) > 2048 || parsed.Host == "" || parsed.User != nil ||
		(parsed.Scheme != "http" && parsed.Scheme != "https") ||
		strings.ContainsAny(target, "\r\n\t") {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidQRURL)
	}

	document, err := renderPrintableNotice(direction, target)

	return operation.File(document, "aviso-libro-reclamaciones-"+direction+".pdf", constants.ContentTypePDF), err
}

func renderPrintableNotice(direction, target string) ([]byte, error) {
	pageOrientation := orientation.Vertical
	topMargin := 18.0
	bottomMargin := 12.0

	if direction == "landscape" {
		pageOrientation = orientation.Horizontal
		topMargin = 12
		bottomMargin = 9
	}

	// prepara la hoja y las fuentes para el aviso
	cfg := config.NewBuilder().WithPageSize(pagesize.A4).WithOrientation(pageOrientation).
		WithCustomFonts([]entity.CustomFont{pdf.RegularFont{}, pdf.BoldFont{}}).
		WithDefaultFont(&props.Font{Family: fontfamily.Helvetica, Style: fontstyle.Normal, Size: 12}).
		WithLeftMargin(18).WithRightMargin(18).WithTopMargin(topMargin).WithBottomMargin(bottomMargin).Build()

	m := maroto.New(cfg)

	// deja el mensaje de indecopi al pie de la hoja
	muted := &props.Color{Red: 119, Green: 119, Blue: 119}
	border := &props.Color{Red: 221, Green: 221, Blue: 221}
	if err := m.RegisterFooter(
		row.New(3).Add(col.New(12).Add(line.New(props.Line{Color: border, Thickness: 0.2, SizePercent: 100}))),
		row.New(8).Add(col.New(12).Add(pdftext.New("En caso de negativa de entrega del libro escriba a: libroreclamaciones@indecopi.gob.pe", props.Text{Size: 12, Align: align.Center, Color: muted}))),
	); err != nil {
		return nil, err
	}

	// ajusta el título, el texto y el qr según la orientación
	titleColor := &props.Color{Red: 17, Green: 24, Blue: 39}
	titleSize := 46.0
	qrHeight := 62.5
	bodyLines := []string{
		"Conforme a lo establecido en el Código de",
		"Protección y Defensa del Consumidor este",
		"establecimiento cuenta con un Libro de",
		"Reclamaciones a tu disposición. Solicítalo para",
		"registrar la queja o reclamo que tengas.",
	}

	if direction == "landscape" {
		titleSize = 40
		qrHeight = 49.4
		bodyLines = []string{
			"Conforme a lo establecido en el Código de Protección y Defensa del Consumidor",
			"este establecimiento cuenta con un Libro de Reclamaciones a tu disposición.",
			"Solicítalo para registrar la queja o reclamo que tengas.",
		}
	}

	// muestra el título y la imagen del libro
	title := props.Text{Size: titleSize, Style: fontstyle.Bold, Align: align.Center, Color: titleColor}
	if direction == "portrait" {
		m.AddRow(19, col.New(12).Add(pdftext.New("LIBRO DE", title)))
		m.AddRow(19, col.New(12).Add(pdftext.New("RECLAMACIONES", title)))
		m.AddRow(9)
	} else {
		m.AddRow(16, col.New(12).Add(pdftext.New("LIBRO DE RECLAMACIONES", title)))
		m.AddRow(6)
	}

	book, err := noticeBookPNG()
	if err != nil {
		return nil, err
	}

	m.AddRow(
		34,
		col.New(12).Add(image.NewFromBytes(book, extension.Png, props.Rect{Center: true, Percent: 100})),
	)

	m.AddRow(9)

	// muestra el texto del aviso y el código qr
	for _, bodyLine := range bodyLines {
		m.AddRow(12, col.New(12).Add(pdftext.New(bodyLine, props.Text{Size: 20, Align: align.Center})))
	}

	if direction == "portrait" {
		m.AddRow(7)
	} else {
		m.AddRow(4)
	}

	m.AddRow(8, col.New(12).Add(pdftext.New("Escanea aquí:", props.Text{Size: 12, Align: align.Center, Color: muted})))
	m.AddRow(qrHeight, col.New(12).Add(code.NewQr(target, props.Rect{Center: true, Percent: 100})))

	displayURL := []rune(target)
	if len(displayURL) > 42 {
		displayURL = append(displayURL[:39], []rune("...")...)
	}

	// usa la fuente de respaldo si el enlace tiene caracteres poco comunes
	urlFont := fontfamily.Helvetica
	for _, character := range displayURL {
		if character > 255 && !strings.ContainsRune("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ", character) {
			urlFont = pdf.FontFamily

			break
		}
	}

	m.AddRow(8, col.New(12).Add(pdftext.New(string(displayURL), props.Text{Family: urlFont, Size: 12, Align: align.Center, Top: 2, Color: muted})))

	document, err := m.Generate()
	if err != nil {
		return nil, err
	}

	return document.GetBytes(), nil
}
