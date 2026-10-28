package storage

import (
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"slices"

	"openreclamos.com/api/internal/shared/constants"
)

const (
	maxUploadBytes  = 10 * 1024 * 1024
	maxRequestBytes = 11 * 1024 * 1024
	maxMemoryBytes  = 1024 * 1024
	maxFileName     = 255
)

// AllowedUploadTypes son los tipos detectados que se aceptan en uploads.
var AllowedUploadTypes = []string{
	constants.ContentTypeJPEG,
	constants.ContentTypePNG,
	"image/webp",
	constants.ContentTypePDF,
}

// Upload es un archivo multipart ya validado.
type Upload struct {
	Data        []byte
	FileName    string
	ContentType string
}

// ReadUpload lee el campo "file" de un multipart y valida tamaño y tipo.
// Si falla, el error contiene el mensaje HTTP para el cliente.
func ReadUpload(w http.ResponseWriter, r *http.Request) (Upload, error) {
	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBytes)

	if err := r.ParseMultipartForm(maxMemoryBytes); err != nil {
		return Upload{}, errors.New(constants.HTTPFileTooLarge)
	}

	// Solo borra temporales en disco; los valores del formulario siguen disponibles.
	defer r.MultipartForm.RemoveAll()

	file, header, err := r.FormFile("file")
	if err != nil {
		return Upload{}, errors.New(constants.HTTPFileRequired)
	}

	defer file.Close()

	return readFile(file, header)
}

func readFile(file multipart.File, header *multipart.FileHeader) (Upload, error) {
	data, err := io.ReadAll(io.LimitReader(file, maxUploadBytes+1))
	if err != nil || len(data) > maxUploadBytes || len(data) == 0 || len(header.Filename) > maxFileName {
		return Upload{}, errors.New(constants.HTTPInvalidFile)
	}

	kind := http.DetectContentType(data)
	if !slices.Contains(AllowedUploadTypes, kind) {
		return Upload{}, errors.New(constants.HTTPFileTypeNotAllowed)
	}

	return Upload{Data: data, FileName: header.Filename, ContentType: kind}, nil
}
