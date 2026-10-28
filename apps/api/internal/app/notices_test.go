package app

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

func TestPrintableNoticeValidatesScopeAndURL(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		s, p, header := ssoTestService(t, db)
		ctx := context.Background()

		store, err := s.Catalogs.Stores.Create(
			ctx,
			p,
			operation.Input{Data: map[string]any{"name": "Tienda", "type": "virtual", "color": "#2563EB"}},
		)
		if err != nil {
			t.Fatal(err)
		}

		id := utils.PublicData(store.Data)["id"].(string)

		for _, data := range []map[string]any{
			{"orientation": "diagonal"}, {"qr_url": "javascript:alert(1)"}, {"qr_url": "https://user:secret@example.com"},
		} {
			if _, err := s.Call(ctx, "GetPrintableNotice", operation.Input{Data: data}, header); connect.CodeOf(
				err,
			) != connect.CodeInvalidArgument {
				t.Fatal("payload inválido aceptado", data, err)
			}
		}

		restricted := p
		restricted.AllStores = false
		restricted.StoreIDs = []string{}

		if _, err = s.Complaints.Notices.Printable(ctx, restricted, operation.Input{Data: map[string]any{"store_id": id}}); connect.CodeOf(
			err,
		) != connect.CodePermissionDenied {
			t.Fatal("se aceptó una tienda no asignada", err)
		}

		out, err := s.Call(
			ctx,
			"GetPrintableNotice",
			operation.Input{Data: map[string]any{"orientation": "landscape", "store_id": id}},
			header,
		)
		if err != nil || out.ContentType != "application/pdf" || len(out.Document) == 0 {
			t.Fatal("RPC no generó el aviso", err)
		}

		if _, err = s.Call(ctx, "GetPrintableNotice", operation.Input{}, nil); connect.CodeOf(
			err,
		) != connect.CodeUnauthenticated {
			t.Fatal("RPC pública sin autorización", err)
		}
	})
}
