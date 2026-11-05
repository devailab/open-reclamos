package storage

import (
	"os"

	"github.com/minio/minio-go/v7"
)

func IsNotFound(err error) bool {
	if os.IsNotExist(err) {
		return true
	}

	switch minio.ToErrorResponse(err).Code {
	case "NoSuchKey", "NoSuchObject", "NotFound":
		return true
	default:
		return false
	}
}
