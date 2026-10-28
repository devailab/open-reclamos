package constants

// Todos los mensajes que ve una persona (respuestas RPC, HTTP, correos, historial,
// consola y configuración) viven aquí. Nunca escribir textos sueltos en los módulos.

// Errores genéricos y de acceso.
const (
	MsgUnknownOperation    = "Operación desconocida."
	MsgDatabaseNotReady    = "La base de datos no está configurada."
	MsgUnauthorized        = "Inicia sesión para continuar."
	MsgDenied              = "No tienes acceso a esta operación."
	MsgNotFound            = "Registro no encontrado."
	MsgAlreadyExists       = "El registro ya existe."
	MsgInvalidData         = "Datos o referencias no válidos."
	MsgOperationFailed     = "No se pudo completar la operación."
	MsgInvalidPage         = "La página no es válida."
	MsgInvalidIdentifier   = "Identificador inválido."
	MsgInvalidReference    = "Referencia inválida."
	MsgWorkersNotReady     = "Los workers no están inicializados."
	MsgWorkersNotStarted   = "Workers no inicializados."
	MsgInvalidEmail        = "Email inválido."
	MsgInvalidSlug         = "Slug inválido."
	MsgSlugTaken           = "Ese identificador ya está en uso. Elige otro para la URL del formulario."
	MsgInvalidFormat       = "Formato inválido."
	MsgInvalidDate         = "Fecha inválida."
	MsgInvalidDateRange    = "Rango de fechas inválido."
	MsgInvalidFilter       = "Filtro inválido."
	MsgSearchTooLong       = "Búsqueda demasiado larga."
	MsgInvalidColor        = "Color inválido."
	MsgInvalidStatusOrID   = "Estado o identificador inválido."
	MsgInvalidCipherKey    = "La clave de cifrado debe ser base64 de 32 bytes."
	MsgInvalidCipherConfig = "Clave de cifrado inválida."
	MsgInvalidCipherText   = "Secreto cifrado inválido."
)

// Identidad: instalación, sesión, perfil y claves API.
const (
	MsgInstallFirst           = "Completa primero la instalación inicial."
	MsgAlreadyInstalled       = "La instalación ya contiene usuarios."
	MsgAccountDataRequired    = "Nombres, apellidos, email y contraseña de entre 12 y 256 caracteres son requeridos."
	MsgUserDocumentRequired   = "Tipo y número de documento (hasta 20 caracteres) son requeridos."
	MsgUserDocumentTaken      = "Ya existe una cuenta con ese documento."
	MsgEmailCodeInvalid       = "El código es incorrecto o venció. Solicita uno nuevo."
	MsgNameRequired           = "Los nombres y apellidos son requeridos y deben tener hasta 120 caracteres cada uno."
	MsgPasswordLength         = "La contraseña debe tener entre 12 y 256 caracteres."
	MsgRecoveryPasswordLength = "Contraseña de entre 12 y 256 caracteres requerida."
	MsgAPIKeyNameRequired     = "El nombre de la clave es requerido."
	MsgInvalidUser            = "Usuario inválido."
	MsgInvalidOrganization    = "Empresa inválida."
	MsgInvalidBusinessDomain  = "Usa hasta 253 caracteres: letras, números, puntos, guiones o guiones bajos; empieza y termina con una letra o número."
	MsgBusinessDomainTaken    = "Ese dominio empresarial ya está registrado en otra organización."
	MsgSSODomainUnavailable   = "No encontramos un acceso SSO disponible para ese dominio empresarial. Confirma el dato con tu administrador."
	MsgJWTKeysNotConfigured   = "claves JWT no configuradas"
)

// SSO.
const (
	MsgSSONameAndProtocolRequired = "Nombre y protocolo SSO requeridos."
	MsgInvalidConnection          = "Conexión inválida."
	MsgOIDCFieldsRequired         = "Issuer HTTPS, client ID y secret son requeridos."
	MsgOIDCDiscoveryFailed        = "No se pudo validar el discovery OIDC."
	MsgSAMLMetadataTooLarge       = "Metadata SAML demasiado grande."
	MsgSAMLMetadataInvalid        = "Metadata SAML inválida."
	MsgSSOReplaceActive           = "Crea y prueba otra conexión antes de sustituir la conexión activa."
	MsgSSOIssuerChange            = "Cambiar issuer o client ID requiere otra conexión."
	MsgInvalidAccessPolicy        = "Política de acceso inválida."
	MsgSSOTestFirst               = "Prueba la conexión antes de activarla."
	MsgSAMLCertificateInvalid     = "Certificado SAML inválido."
	MsgSAMLCertificateExpired     = "Certificado SAML vencido o inválido."
	MsgSAMLNeedsHTTPS             = "SAML necesita HTTPS."
	MsgSAMLRedirectBinding        = "El IdP debe soportar HTTP Redirect."
	MsgSAMLSignatureAlgorithm     = "El algoritmo de firma SAML no está permitido."
	MsgSSOMissingSubject          = "El proveedor SSO no envió un identificador estable."
	MsgSSOFailed                  = "No se pudo completar el acceso SSO. Reintenta o contacta a tu administrador."
	MsgSSOMetadataUnavailable     = "Metadata no disponible"
)

// Organizaciones, miembros, invitaciones y plataforma.
const (
	MsgOrganizationAndStoreRequired = "Empresa y tienda son requeridas."
	MsgOrganizationDataRequired     = "Nombre, razón social y dirección son requeridos."
	MsgInvalidDistrict              = "Distrito inválido."
	MsgInvalidSlugOrTaxID           = "Slug o RUC inválido."
	MsgDeadlineRange                = "El plazo debe estar entre 1 y 365 días."
	MsgInvalidMCPTool               = "Herramienta MCP inválida."
	MsgInvalidRole                  = "Rol inválido."
	MsgInvalidStoreAccess           = "Acceso a tiendas inválido."
	MsgInvalidStoreList             = "Lista de tiendas inválida."
	MsgLastAdministrator            = "No puedes quitar al último administrador."
	MsgPlatformPasswordRequired     = "Confirma tu contraseña para completar esta acción."
	MsgPlatformPasswordInvalid      = "La contraseña es incorrecta."
	MsgInvalidInvitation            = "Invitación inválida."
	MsgInvitationUnavailable        = "La invitación no está disponible."
	MsgInvitationEmailMismatch      = "El email no corresponde a la invitación."
	MsgInvitationAccountRequired    = "Nombres, apellidos y contraseña de al menos 12 caracteres son requeridos."
	MsgInvitationSubject            = "Invitación a "
	MsgInvitationBody               = "Ingresa a "
)

// Catálogos: tiendas, motivos y categorías.
const (
	MsgInvalidStore            = "Tienda inválida."
	MsgInvalidStoreNameOrColor = "Nombre o color de tienda inválido."
	MsgInvalidStoreType        = "Tipo de tienda inválido."
	MsgPhysicalStoreAddress    = "La tienda física necesita distrito y dirección."
	MsgInvalidStoreURL         = "URL de tienda inválida."
	MsgInvalidReason           = "Motivo inválido."
	MsgReasonCycle             = "La jerarquía de motivos no puede contener ciclos."
	MsgInvalidCategory         = "Categoría inválida."
)

// Reclamos: formulario público, revisión, documentos y exportaciones.
const (
	MsgInvalidComplaint         = "Reclamo inválido."
	MsgInvalidBoolean           = "Indicador booleano inválido."
	MsgInvalidFileList          = "Lista de archivos inválida."
	MsgInvalidPersonOrType      = "Tipo de persona o reclamo inválido."
	MsgInvalidConsumer          = "Datos de consumidor inválidos."
	MsgInvalidJuridicalPerson   = "Datos de persona jurídica inválidos."
	MsgCompanyDataNotApplicable = "Datos de empresa no aplican a persona natural."
	MsgGuardianRequired         = "Datos del tutor requeridos."
	MsgGuardianOnlyMinors       = "El tutor solo aplica a menores."
	MsgFieldTooLong             = "Un campo supera el tamaño permitido."
	MsgInvalidDetailValue       = "Valor de detalle inválido."
	MsgInvalidAmount            = "El monto debe ser una cadena decimal válida."
	MsgInvalidDialCode          = "Código telefónico inválido."
	MsgProofNotApplicable       = "Datos de comprobante no aplican."
	MsgInvalidIncidentDate      = "Fecha de incidente inválida."
	MsgTooManyFiles             = "Solo se permiten hasta 5 archivos."
	MsgStoreNotInOrganization   = "La tienda no corresponde a la empresa."
	MsgFormUnavailable          = "Formulario no disponible."
	MsgInvalidFile              = "Archivo inválido."
	MsgResponseTooLong          = "La respuesta es demasiado larga."
	MsgAlreadyAnswered          = "El reclamo ya tiene respuesta."
	MsgAlreadyAnsweredOfficial  = "El reclamo ya tiene respuesta oficial."
	MsgOfficialResponseRequired = "La respuesta oficial es requerida (máximo 10000 caracteres)."
	MsgInvalidPriority          = "Prioridad inválida."
	MsgNoResponseYet            = "El reclamo aún no tiene respuesta."
	MsgInvalidAttachment        = "Adjunto inválido."
	MsgInvalidOrientation       = "Orientación inválida."
	MsgInvalidQRURL             = "El enlace del QR debe ser una URL HTTP o HTTPS válida."
	MsgExportTooLarge           = "Selecciona un rango con hasta 10 000 reclamos."
	MsgInvalidExport            = "Exportación inválida."
	MsgExportFailed             = "No se pudo completar la exportación."
	MsgTrackingCodeRequired     = "Código de seguimiento requerido."
	MsgReceiptMetadataMissing   = "metadatos de constancia incompletos"
	MsgReceiptPageLimit         = "la constancia excede los límites de página"
)

// Notas públicas del historial del reclamo.
const (
	HistoryComplaintCreated = "Tu reclamo fue registrado exitosamente."
	HistoryInReview         = "Tu reclamo está siendo revisado por nuestro equipo."
	HistoryResponded        = "Se registró una respuesta oficial a tu reclamo."
)

// Integraciones: webhooks, correo, captcha y consulta documental.
const (
	MsgInvalidWebhookData      = "Datos de webhook inválidos."
	MsgUnknownEvent            = "Evento desconocido."
	MsgWebhookMustBeHTTPS      = "El destino debe ser HTTPS."
	MsgWebhookTargetForbidden  = "Destino de webhook no permitido."
	MsgInvalidTimeout          = "Timeout inválido."
	MsgInvalidWebhook          = "Webhook inválido."
	MsgWebhookSecretLength     = "El secreto debe tener entre 16 y 256 caracteres."
	MsgInvalidDelivery         = "Entrega inválida."
	MsgDeliveryAlreadySent     = "La entrega ya fue enviada."
	MsgWebhookDeliveryFailed   = "No se pudo entregar el webhook."
	MsgCaptchaUnavailable      = "No se pudo validar el captcha."
	MsgCaptchaInvalid          = "Captcha inválido."
	MsgInvalidDocument         = "Documento inválido."
	MsgUnknownDocumentProvider = "Proveedor documental desconocido."
	MsgUnresolvableTarget      = "destino no resoluble"
	MsgPrivateTarget           = "destino privado"
	MsgProviderMustUseHTTPS    = "el proveedor debe usar HTTPS sin credenciales en la URL"
)

// Correo saliente.
const (
	MsgInvalidMailAddress   = "Dirección de correo inválida."
	MsgInvalidSMTPTLSMode   = "Modo TLS de SMTP inválido."
	MsgEmailSendFailed      = "No se pudo enviar el correo."
	MailTestSubject         = "Prueba de correo — Open Reclamos"
	MailTestBody            = "El servicio de correo está configurado correctamente."
	MailNewComplaintSubject = "Nuevo reclamo "
	MailNewComplaintBody    = "Se registró un reclamo. Ingresa al dashboard para revisarlo."
	MailComplaintSubject    = "Libro de reclamaciones — "
	MailComplaintBody       = "Adjuntamos tu documento. Código de seguimiento: "
	MailVerifyEmailSubject  = "Código de verificación — Open Reclamos"
	MailVerifyEmailBody     = "Tu código para verificar el correo es %s. Vence en 15 minutos."
)

// Diagnóstico de la prueba SMTP: indica el paso fallido sin exponer secretos.
const (
	MsgSMTPTestFailed = "No se pudo enviar el correo de prueba."
	MsgSMTPConnect    = "No se pudo conectar al servidor SMTP. Revisa SMTP_HOST, SMTP_PORT y la conectividad."
	MsgSMTPTLS        = "No se pudo establecer TLS con el servidor SMTP. Revisa SMTP_TLS_MODE y el certificado del proveedor."
	MsgSMTPAuth       = "El servidor SMTP rechazó la autenticación. Revisa SMTP_USER y SMTP_PASSWORD o el token SMTP del proveedor."
	MsgSMTPFrom       = "El servidor SMTP rechazó el remitente. Revisa SMTP_FROM y la verificación del dominio en el proveedor."
	MsgSMTPRecipient  = "El servidor SMTP rechazó el destinatario del correo de prueba."
	MsgSMTPData       = "El servidor SMTP no aceptó el contenido del correo de prueba."
	MsgSMTPCodeSuffix = " Código SMTP: %d."
)

// Almacenamiento de archivos.
const (
	MsgInvalidS3Endpoint = "Endpoint S3 inválido."
	MsgInvalidFileKey    = "Clave de archivo inválida."
	MsgInvalidKey        = "Clave inválida."
	MsgFileTooLarge      = "El archivo supera el tamaño permitido."
)

// Respuestas HTTP planas (uploads, descargas, SSO, MCP y middleware).
const (
	HTTPDatabaseNotConfigured = "Base de datos no configurada"
	HTTPDBNotConfigured       = "DB no configurada"
	HTTPDatabaseUnavailable   = "Base de datos no disponible"
	HTTPAccessExpired         = "Acceso vencido"
	HTTPUnauthorized          = "No autorizado"
	HTTPFileTooLarge          = "Archivo demasiado grande o inválido"
	HTTPFileRequired          = "Archivo requerido"
	HTTPInvalidFile           = "Archivo inválido"
	HTTPFileTypeNotAllowed    = "Tipo de archivo no permitido"
	HTTPLogoType              = "El logo debe ser PNG o JPEG"
	HTTPFormUnavailable       = "Formulario no disponible"
	HTTPInvalidCaptcha        = "Captcha inválido"
	HTTPStoreFailed           = "No se pudo almacenar"
	HTTPRegisterFileFailed    = "No se pudo registrar el archivo"
	HTTPInvalidData           = "Datos inválidos"
	HTTPWorkersUnavailable    = "Workers no disponibles"
	HTTPFileUnavailable       = "Archivo no disponible"
	HTTPAPIKeyRequired        = "Clave API requerida"
	HTTPSettingsUnavailable   = "Configuración no disponible"
	HTTPInvalidSettings       = "Configuración inválida"
	HTTPOriginNotAllowed      = "Origen no permitido"
	HTTPTooManyRequests       = "Demasiadas solicitudes"
)

// API pública REST y MCP.
const (
	APIInvalidKey      = "Clave API inválida."
	APIForbidden       = "No tienes permiso."
	APIInvalidData     = "Datos inválidos."
	APIConflict        = "La operación entra en conflicto con el estado actual."
	APIBearerRequired  = "Se requiere Authorization: Bearer."
	MCPToolDescription = "Consulta de datos autorizados de la empresa."
	APITitle           = "Open Reclamos API"
)

// Consola (CLI) y registros del servidor.
const (
	CLIRunFailed          = "No se pudo ejecutar la aplicación"
	CLIUnexpectedArgs     = "argumentos inesperados; uso: open-reclamos [--env-file ruta] serve"
	CLIUnknownCommand     = "comando desconocido; disponibles: serve, version, migrate, seed, bootstrap, reset-password, recover-sso"
	CLIFlagEnvFile        = "Archivo de configuración externo"
	CLIFlagName           = "Nombre del administrador inicial"
	CLIFlagLastName       = "Apellidos del administrador inicial"
	CLIFlagEmail          = "Email para bootstrap o recuperación"
	CLIFlagDocumentType   = "Tipo de documento del administrador inicial (DNI, CE o PASAPORTE)"
	CLIFlagDocumentNumber = "Número de documento del administrador inicial"
	CLIFlagOrganization   = "Empresa para recuperación SSO"
	CLIDefaultAdminName   = "Administrador"
	CLIPasswordPrompt     = "Contraseña: "
	CLIPasswordTooLong    = "contraseña demasiado larga"
	LogMigrationsApplied  = "Migraciones aplicadas"
	LogCatalogsSeeded     = "Catálogos sembrados"
	LogServerStarted      = "Servidor iniciado"
	LogServerStopping     = "Deteniendo servidor"
	CLIServerStartFailed  = "no se pudo iniciar el servidor HTTP"
	CLIServerStopTimedOut = "se agotó el tiempo de apagado del servidor"
)

// Configuración y base de datos.
const (
	CfgEnvFileFailed         = "no se pudo cargar el archivo de entorno"
	CfgInvalidHTTPAddr       = "HTTP_ADDR debe tener formato host:puerto"
	CfgInvalidPublicBaseURL  = "PUBLIC_BASE_URL debe ser un origen HTTP o HTTPS válido"
	CfgInvalidPublicSignup   = "ALLOW_PUBLIC_REGISTRATION debe ser true o false"
	CfgInvalidBoolean        = "%s debe ser true o false"
	CfgSMTPRequired          = "SMTP_HOST y SMTP_FROM son requeridas"
	CfgInvalidSMTPTLSMode    = "SMTP_TLS_MODE debe ser tls, starttls o none"
	CfgTurnstileKeysMissing  = "faltan las claves de Turnstile"
	CfgInvalidStorageDriver  = "STORAGE_DRIVER debe ser local o s3"
	CfgS3CredentialsMissing  = "faltan credenciales S3"
	CfgInvalidS3Endpoint     = "S3_ENDPOINT debe ser un origen HTTP o HTTPS válido"
	CfgMissingValue          = "falta configurar %s"
	CfgInvalidDatabaseDriver = "DATABASE_DRIVER debe ser sqlite o postgres"
	CfgPostgresURLRequired   = "DATABASE_URL o DB_HOST, DB_USER, DB_PASSWORD y DB_NAME son requeridas con PostgreSQL"
	CfgJWTDirectoryFailed    = "no se pudo preparar el directorio de claves JWT: %w"
	CfgJWTSaveFailed         = "no se pudieron guardar las claves JWT"
	CfgJWTOpenFailed         = "no se pudo abrir el archivo de claves JWT: %w"
	CfgJWTReadFailed         = "no se pudieron leer las claves JWT: %w"
	CfgJWTInvalidFile        = "archivo de claves JWT inválido"
	CfgJWTInvalidKeys        = "JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser claves base64 distintas de al menos 32 bytes"
	DBMigrationsRequired     = "aplica las migraciones con el comando migrate antes de continuar"
	DBInvalidPostgresConfig  = "configuración PostgreSQL inválida"
	DBSQLiteDirectoryFailed  = "no se pudo crear el directorio de SQLite"
	DBUnknownDriver          = "motor de base de datos desconocido: %q"
	DBOpenFailed             = "no se pudo abrir la base de datos"
	DBUnavailable            = "la base de datos no está disponible"
)
