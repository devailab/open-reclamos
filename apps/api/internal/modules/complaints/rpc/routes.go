// Package rpc conecta las operaciones RPC del módulo de reclamos con sus features.
package rpc

import (
	"openreclamos.com/api/internal/modules/complaints/feature/auditlog"
	"openreclamos.com/api/internal/modules/complaints/feature/complaints"
	"openreclamos.com/api/internal/modules/complaints/feature/dashboard"
	"openreclamos.com/api/internal/modules/complaints/feature/documents"
	"openreclamos.com/api/internal/modules/complaints/feature/exports"
	"openreclamos.com/api/internal/modules/complaints/feature/notices"
	"openreclamos.com/api/internal/modules/complaints/feature/public"
	"openreclamos.com/api/internal/modules/complaints/feature/review"
	. "openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/operation"
)

func Register(
	r *operation.Registry,
	public *public.Feature,
	complaints *complaints.Feature,
	review *review.Feature,
	dashboard *dashboard.Feature,
	auditlog *auditlog.Feature,
	notices *notices.Feature,
	documents *documents.Feature,
	exports *exports.Feature,
) {
	r.Public(OpGetPublicBook, public.Book)
	r.Public(OpSubmitComplaint, public.Submit)
	r.Public(OpTrackComplaint, public.Track)

	r.Tenant(OpListComplaints, PermissionRead, complaints.List)
	r.Tenant(OpListFeatured, PermissionRead, complaints.ListFeatured)
	r.Tenant(OpGetComplaint, PermissionRead, complaints.Get)
	r.Tenant(OpGetAttachmentDownloadURL, PermissionRead, complaints.AttachmentURL)

	r.Tenant(OpStartReview, PermissionRespond, review.Start)
	r.Tenant(OpSaveDraft, PermissionRespond, review.SaveDraft)
	r.Tenant(OpUpdateClassification, PermissionRespond, review.Classify)
	r.Tenant(OpRespond, PermissionRespond, review.Respond)

	r.Tenant(OpGetDashboard, PermissionRead, dashboard.Get)
	r.Tenant(OpListAudit, PermissionAdmin, auditlog.List)

	r.Tenant(OpGetNotices, PermissionRead, notices.Links)
	r.Tenant(OpGetPrintableNotice, PermissionRead, notices.Printable)

	r.Tenant(OpGetReceipt, PermissionRead, documents.Receipt)
	r.Tenant(OpGetResponsePDF, PermissionRead, documents.ResponsePDF)

	r.Tenant(OpExportBook, PermissionRead, exports.Export)
	r.Tenant(OpGetExport, PermissionRead, exports.Get)
}
