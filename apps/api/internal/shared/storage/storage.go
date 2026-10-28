// Package storage guarda archivos en disco local o en un bucket S3 compatible.
package storage

import (
	"bytes"
	"context"
	"io"
	"net/url"
	"os"
	"path"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

const (
	DriverS3      = "s3"
	maxObjectSize = 64 * 1024 * 1024
)

// Prefijos de las claves de objetos.
const (
	PrefixUploads   = "uploads/"
	PrefixLogos     = "logos/"
	PrefixExports   = "exports/"
	PrefixDocuments = "documents/"
)

type Storage struct {
	Config *config.Config
}

func (s *Storage) s3Client() (*minio.Client, error) {
	u, err := url.Parse(s.Config.S3Endpoint)
	if err != nil || u.Host == "" {
		return nil, apperrors.Invalid(constants.MsgInvalidS3Endpoint)
	}

	return minio.New(
		u.Host,
		&minio.Options{
			Creds:  credentials.NewStaticV4(s.Config.S3AccessKey, s.Config.S3SecretKey, ""),
			Secure: u.Scheme == "https",
			Region: s.Config.S3Region,
		},
	)
}

// Put guarda data bajo key; las exportaciones se escriben de forma atómica.
func (s *Storage) Put(ctx context.Context, key, contentType string, data []byte) error {
	if !SafeKey(key) {
		return apperrors.Invalid(constants.MsgInvalidFileKey)
	}

	if s.Config.StorageDriver == DriverS3 {
		client, err := s.s3Client()
		if err != nil {
			return err
		}

		_, err = client.PutObject(
			ctx,
			s.Config.S3Bucket,
			key,
			bytes.NewReader(data),
			int64(len(data)),
			minio.PutObjectOptions{ContentType: contentType},
		)

		return err
	}

	if err := os.MkdirAll(s.Config.StorageLocalDir, 0700); err != nil {
		return err
	}

	root, err := os.OpenRoot(s.Config.StorageLocalDir)
	if err != nil {
		return err
	}

	defer root.Close()

	if err = root.MkdirAll(path.Dir(key), 0700); err != nil {
		return err
	}

	writeKey := key

	if strings.HasPrefix(key, PrefixExports) {
		writeKey = key + ".tmp-" + utils.NewID()
	}

	file, err := root.OpenFile(writeKey, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}

	_, err = file.Write(data)
	closeErr := file.Close()

	if err != nil {
		_ = root.Remove(writeKey)

		return err
	}

	if closeErr != nil {
		_ = root.Remove(writeKey)

		return closeErr
	}

	if writeKey != key {
		return root.Rename(writeKey, key)
	}

	return nil
}

// Get lee un objeto completo (hasta 64 MiB).
func (s *Storage) Get(ctx context.Context, key string) ([]byte, error) {
	if !SafeKey(key) {
		return nil, apperrors.Invalid(constants.MsgInvalidKey)
	}

	var reader io.ReadCloser
	var err error

	if s.Config.StorageDriver == DriverS3 {
		client, e := s.s3Client()
		if e != nil {
			return nil, e
		}

		reader, err = client.GetObject(ctx, s.Config.S3Bucket, key, minio.GetObjectOptions{})
	} else {
		root, e := os.OpenRoot(s.Config.StorageLocalDir)
		if e != nil {
			return nil, e
		}

		defer root.Close()

		reader, err = root.Open(key)
	}

	if err != nil {
		return nil, err
	}

	defer reader.Close()

	data, err := io.ReadAll(io.LimitReader(reader, maxObjectSize+1))
	if len(data) > maxObjectSize {
		return nil, apperrors.Invalid(constants.MsgFileTooLarge)
	}

	return data, err
}

// Delete borra un objeto; no falla si ya no existe en disco.
func (s *Storage) Delete(ctx context.Context, key string) error {
	if !SafeKey(key) {
		return apperrors.Invalid(constants.MsgInvalidKey)
	}

	if s.Config.StorageDriver == DriverS3 {
		client, err := s.s3Client()
		if err != nil {
			return err
		}

		return client.RemoveObject(ctx, s.Config.S3Bucket, key, minio.RemoveObjectOptions{})
	}

	root, err := os.OpenRoot(s.Config.StorageLocalDir)
	if os.IsNotExist(err) {
		return nil
	}

	if err != nil {
		return err
	}

	defer root.Close()

	err = root.Remove(key)
	if os.IsNotExist(err) {
		return nil
	}

	return err
}

// SafeKey rechaza rutas absolutas, ocultas o con saltos de directorio.
func SafeKey(key string) bool {
	return key != "" && path.Clean(key) == key && !strings.Contains(key, "\\") && !strings.HasPrefix(key, "/") &&
		!strings.HasPrefix(key, ".") &&
		!strings.Contains(key, "/../")
}
