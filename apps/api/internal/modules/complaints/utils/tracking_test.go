package utils

import (
	"regexp"
	"testing"
)

func TestTrackingCodeMatchesOriginalFormat(t *testing.T) {
	pattern := regexp.MustCompile(`^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$`)

	for range 100 {
		code, err := GenerateTrackingCode()
		if err != nil {
			t.Fatal(err)
		}

		if !pattern.MatchString(code) {
			t.Fatalf("código incompatible con el formato original: %q", code)
		}
	}
}
