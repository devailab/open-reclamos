package config

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"openreclamos.com/api/internal/shared/constants"
)

// Las claves persisten entre reinicios; nunca se publican en /api/config.
func (c *Config) loadJWTKeys() error {
	if c.JWTAccessSecret != "" || c.JWTRefreshSecret != "" {
		return validateJWTKeys(c.JWTAccessSecret, c.JWTRefreshSecret)
	}

	if err := os.MkdirAll(filepath.Dir(c.JWTKeyFile), 0700); err != nil {
		return fmt.Errorf(constants.CfgJWTDirectoryFailed, err)
	}

	file, err := os.OpenFile(c.JWTKeyFile, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err == nil {
		keys := struct {
			Access  string `json:"access"`
			Refresh string `json:"refresh"`
		}{
			base64.StdEncoding.EncodeToString(randomKey()), base64.StdEncoding.EncodeToString(randomKey()),
		}

		err = json.NewEncoder(file).Encode(keys)
		closeErr := file.Close()
		if err != nil || closeErr != nil {
			return errors.New(constants.CfgJWTSaveFailed)
		}
	} else if !os.IsExist(err) {
		return fmt.Errorf(constants.CfgJWTOpenFailed, err)
	}

	data, err := os.ReadFile(c.JWTKeyFile)
	if err != nil {
		return fmt.Errorf(constants.CfgJWTReadFailed, err)
	}

	var keys struct {
		Access  string `json:"access"`
		Refresh string `json:"refresh"`
	}

	if err = json.Unmarshal(data, &keys); err != nil {
		return errors.New(constants.CfgJWTInvalidFile)
	}

	c.JWTAccessSecret, c.JWTRefreshSecret = keys.Access, keys.Refresh

	return validateJWTKeys(keys.Access, keys.Refresh)
}

func randomKey() []byte {
	key := make([]byte, 32)

	if _, err := rand.Read(key); err != nil {
		panic(err)
	}

	return key
}

func validateJWTKeys(access, refresh string) error {
	a, errA := base64.StdEncoding.DecodeString(access)
	r, errR := base64.StdEncoding.DecodeString(refresh)
	if errA != nil || errR != nil || len(a) < 32 || len(r) < 32 || access == refresh {
		return errors.New(constants.CfgJWTInvalidKeys)
	}

	return nil
}
