package notices

import (
	"bytes"
	"testing"

	pdfapi "github.com/pdfcpu/pdfcpu/pkg/api"
)

func TestPrintableNoticeIsSingleA4Page(t *testing.T) {
	for _, direction := range []string{"portrait", "landscape"} {
		t.Run(direction, func(t *testing.T) {
			data, err := renderPrintableNotice(direction, "https://example.com/c/company")
			if err != nil {
				t.Fatal(err)
			}

			if !bytes.HasPrefix(data, []byte("%PDF-")) {
				t.Fatal("no se generó PDF")
			}

			pages, err := pdfapi.PageCount(bytes.NewReader(data), nil)
			if err != nil || pages != 1 {
				t.Fatalf("el aviso debe ocupar una hoja: %d %v", pages, err)
			}

			dimensions, err := pdfapi.PageDims(bytes.NewReader(data), nil)
			if err != nil || len(dimensions) != 1 {
				t.Fatal("dimensiones inválidas", err)
			}

			page := dimensions[0]
			if direction == "portrait" && (page.Width > page.Height || page.Width < 590 || page.Height < 840) {
				t.Fatal("A4 vertical incorrecto", page)
			}

			if direction == "landscape" && (page.Width < page.Height || page.Width < 840 || page.Height < 590) {
				t.Fatal("A4 horizontal incorrecto", page)
			}
		})
	}
}
