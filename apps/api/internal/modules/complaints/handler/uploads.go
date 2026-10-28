package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/riverqueue/river"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/jobs"
	"openreclamos.com/api/internal/shared/storage"
	"openreclamos.com/api/internal/shared/utils"
)

const (
	// uploadLifetime es el tiempo para usar un upload en un reclamo antes de borrarlo.
	uploadLifetime        = time.Hour
	maxDeleteRequestBytes = 4096
)

// Upload recibe un adjunto del formulario público; devuelve id y token para reclamarlo.
func (h *Handler) Upload(w http.ResponseWriter, r *http.Request) {
	upload, err := storage.ReadUpload(w, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)

		return
	}

	store, err := h.deps.Repo.GetPublicStore(r.Context(), r.FormValue("store_slug"))
	if err != nil {
		http.Error(w, constants.HTTPFormUnavailable, http.StatusBadRequest)

		return
	}

	if err = h.deps.Captcha.Verify(r.Context(), r.FormValue("turnstile_token")); err != nil {
		http.Error(w, constants.HTTPInvalidCaptcha, http.StatusBadRequest)

		return
	}

	id, raw := utils.NewID(), utils.Token()
	key := storage.PrefixUploads + store.OrganizationID + "/" + id

	if err = h.deps.Storage.Put(r.Context(), key, upload.ContentType, upload.Data); err != nil {
		http.Error(w, constants.HTTPStoreFailed, http.StatusInternalServerError)

		return
	}

	err = h.deps.Repo.CreateUpload(
		r.Context(),
		repository.CreateUploadParams{
			ID:             id,
			OrganizationID: store.OrganizationID,
			StoreID:        store.ID,
			StorageKey:     key,
			TokenHash:      utils.Hash(raw),
			FileName:       upload.FileName,
			ContentType:    upload.ContentType,
			SizeBytes:      int64(len(upload.Data)),
			ExpiresAt:      time.Now().Add(uploadLifetime),
		},
	)
	if err != nil {
		_ = h.deps.Storage.Delete(r.Context(), key)

		http.Error(w, constants.HTTPRegisterFileFailed, http.StatusInternalServerError)

		return
	}

	w.Header().Set("Content-Type", constants.ContentTypeJSON)

	json.NewEncoder(w).
		Encode(map[string]any{"id": id, "token": raw, "file_name": upload.FileName, "content_type": upload.ContentType})
}

// DeleteUpload descarta un upload no reclamado y encola el borrado del archivo.
func (h *Handler) DeleteUpload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxDeleteRequestBytes)

	var input struct {
		ID    string `json:"id"`
		Token string `json:"token"`
	}
	if json.NewDecoder(r.Body).Decode(&input) != nil || !utils.ValidID(input.ID) {
		http.Error(w, constants.HTTPInvalidData, http.StatusBadRequest)

		return
	}

	if !h.deps.Jobs.Ready() {
		http.Error(w, constants.HTTPWorkersUnavailable, http.StatusServiceUnavailable)

		return
	}

	err := h.deps.Transaction(r.Context(), func(q *repository.Repository) error {
		key, err := q.DeleteUnclaimedUpload(
			r.Context(),
			repository.DeleteUnclaimedUploadParams{ID: input.ID, TokenHash: utils.Hash(input.Token)},
		)
		if err != nil {
			return err
		}

		return h.deps.Jobs.InsertTx(r.Context(), q, jobs.DeleteObjectArgs{Key: key}, &river.InsertOpts{MaxAttempts: 5})
	})
	if err != nil {
		http.Error(w, constants.HTTPFileUnavailable, http.StatusNotFound)

		return
	}

	w.WriteHeader(http.StatusNoContent)
}
