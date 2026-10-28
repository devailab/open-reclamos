package constants

// Nombres de las operaciones RPC. Deben coincidir con los métodos de
// packages/contracts/proto/openreclamos/backend/v1/backend.proto.

// Rutas base de RPC.
const (
	RPCMount           = "/rpc"
	RPCPrefix          = RPCMount + "/"
	BackendServiceName = "openreclamos.backend.v1.BackendService"
	RefreshTokenPath   = RPCPrefix + BackendServiceName + "/" + OpRefreshToken
)

// Identidad.
const (
	OpGetInstallationStatus = "GetInstallationStatus"
	OpInstall               = "Install"
	OpRegister              = "Register"
	OpLogin                 = "Login"
	OpVerifyEmail           = "VerifyEmail"
	OpRefreshToken          = "RefreshToken"
	OpLogout                = "Logout"
	OpGetSession            = "GetSession"
	OpUpdateProfile         = "UpdateProfile"
	OpChangePassword        = "ChangePassword"
	OpListAPIKeys           = "ListAPIKeys"
	OpCreateAPIKey          = "CreateAPIKey"
	OpRevokeAPIKey          = "RevokeAPIKey"
	OpGetLoginOptions       = "GetLoginOptions"
	OpListSSOConnections    = "ListSSOConnections"
	OpGetSSOSettings        = "GetSSOSettings"
	OpSaveSSOConnection     = "SaveSSOConnection"
	OpUpdateSSOPolicy       = "UpdateSSOPolicy"
	OpGetSSOMetadata        = "GetSSOMetadata"
)

// Organizaciones.
const (
	OpListOrganizations         = "ListOrganizations"
	OpSwitchOrganization        = "SwitchOrganization"
	OpCreateOrganization        = "CreateOrganization"
	OpCompleteSetup             = "CompleteSetup"
	OpSuggestOrganizationSlug   = "SuggestOrganizationSlug"
	OpGetOrganization           = "GetOrganization"
	OpUpdateOrganization        = "UpdateOrganization"
	OpGetSettings               = "GetSettings"
	OpUpdateSettings            = "UpdateSettings"
	OpRemoveLogo                = "RemoveLogo"
	OpListUsers                 = "ListUsers"
	OpGetUserAccess             = "GetUserAccess"
	OpUpdateUserAccess          = "UpdateUserAccess"
	OpRemoveUser                = "RemoveUser"
	OpListRoles                 = "ListRoles"
	OpListInvitations           = "ListInvitations"
	OpCreateInvitation          = "CreateInvitation"
	OpRevokeInvitation          = "RevokeInvitation"
	OpGetInvitation             = "GetInvitation"
	OpAcceptInvitation          = "AcceptInvitation"
	OpSendInvitationEmail       = "SendInvitationEmail"
	OpGetPlatformOverview       = "GetPlatformOverview"
	OpListPlatformOrganizations = "ListPlatformOrganizations"
	OpSetOrganizationStatus     = "SetOrganizationStatus"
)

// Catálogos.
const (
	OpListCountries       = "ListCountries"
	OpListUbigeos         = "ListUbigeos"
	OpListStores          = "ListStores"
	OpGetStore            = "GetStore"
	OpCreateStore         = "CreateStore"
	OpUpdateStore         = "UpdateStore"
	OpDeactivateStore     = "DeactivateStore"
	OpSetStoreFormEnabled = "SetStoreFormEnabled"
	OpSuggestStoreSlug    = "SuggestStoreSlug"
	OpListReasons         = "ListReasons"
	OpCreateReason        = "CreateReason"
	OpUpdateReason        = "UpdateReason"
	OpDeleteReason        = "DeleteReason"
	OpListCategories      = "ListCategories"
	OpCreateCategory      = "CreateCategory"
	OpUpdateCategory      = "UpdateCategory"
	OpDeleteCategory      = "DeleteCategory"
)

// Reclamos.
const (
	OpGetPublicBook            = "GetPublicBook"
	OpSubmitComplaint          = "SubmitComplaint"
	OpTrackComplaint           = "TrackComplaint"
	OpListComplaints           = "ListComplaints"
	OpListFeatured             = "ListFeatured"
	OpGetComplaint             = "GetComplaint"
	OpStartReview              = "StartReview"
	OpSaveDraft                = "SaveDraft"
	OpUpdateClassification     = "UpdateClassification"
	OpRespond                  = "Respond"
	OpGetDashboard             = "GetDashboard"
	OpListAudit                = "ListAudit"
	OpGetNotices               = "GetNotices"
	OpGetPrintableNotice       = "GetPrintableNotice"
	OpExportBook               = "ExportBook"
	OpGetExport                = "GetExport"
	OpGetReceipt               = "GetReceipt"
	OpGetResponsePDF           = "GetResponsePDF"
	OpGetAttachmentDownloadURL = "GetAttachmentDownloadURL"
)

// Integraciones.
const (
	OpLookupDocument = "LookupDocument"
	OpTestEmail      = "TestEmail"
	OpListWebhooks   = "ListWebhooks"
	OpCreateWebhook  = "CreateWebhook"
	OpUpdateWebhook  = "UpdateWebhook"
	OpDeleteWebhook  = "DeleteWebhook"
	OpListDeliveries = "ListDeliveries"
	OpRetryDelivery  = "RetryDelivery"
)
