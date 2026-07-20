export const MESSAGES = {
	common: {
		permissionDenied: 'No tienes permisos para realizar esta acción.',
		notAuthenticated: 'No estás autenticado',
	},
	auth: {
		passwordLoginDisabled:
			'El acceso con correo y contraseña está deshabilitado.',
		registrationDisabled:
			'El registro de nuevas cuentas no está disponible.',
		localRegistrationDisabled:
			'El registro local está deshabilitado. Usa el acceso SSO.',
		accountNotFoundRestart:
			'No se encontró la cuenta. Inicia el registro nuevamente.',
		accountCreateFailed:
			'No se pudo crear la cuenta. Intenta con otro email.',
		emailAlreadyRegistered:
			'Ya existe una cuenta verificada con este correo. Inicia sesión.',
	},
	account: {
		wrongCurrentPassword: 'Contraseña actual incorrecta. Intenta de nuevo.',
		nameRequired: 'El nombre es requerido',
		allFieldsRequired: 'Todos los campos son requeridos',
		profileUpdateFailed:
			'No se pudo actualizar el perfil. Intenta de nuevo.',
		apiKeyCreateFailed: 'No se pudo generar la API key. Intenta de nuevo.',
		apiKeyRegenerateFailed:
			'No se pudo regenerar la API key. Intenta de nuevo.',
		apiKeyAlreadyActive:
			'Ya tienes una API key activa. Usa regenerar para crear una nueva.',
	},
	setup: {
		organizationSaveFailed:
			'Error al guardar la organización. Inténtalo de nuevo.',
		storeSaveFailed: 'Error al guardar la tienda. Inténtalo de nuevo.',
		rucLookupFailed:
			'Error de conexión al consultar el RUC. Inténtalo de nuevo.',
		rucAlreadyRegistered: 'Este RUC ya está registrado en la plataforma.',
		rucAlreadyRegisteredShort:
			'Este RUC ya está registrado en la plataforma',
		slugTaken: 'Este identificador ya está en uso. Elige otro.',
		pendingOrganizationNotFound:
			'No se encontró la organización pendiente. Vuelve a crearla para continuar.',
		rucLocationUnverified:
			'No se pudo verificar la ubicación del RUC. Contacta a soporte.',
		rucNotFound: 'RUC no encontrado en SUNAT',
	},
	stores: {
		notFound: 'La tienda no fue encontrada.',
		inactiveNotEditable: 'La tienda está inactiva y no se puede editar.',
		alreadyInactive: 'La tienda ya está inactiva.',
		createFailed: 'No se pudo crear la tienda. Inténtalo nuevamente.',
		updateFailed: 'No se pudo actualizar la tienda. Inténtalo nuevamente.',
		deactivateFailed:
			'No se pudo desactivar la tienda. Inténtalo nuevamente.',
		formUpdateFailed:
			'No se pudo actualizar el formulario de la tienda. Inténtalo nuevamente.',
	},
	categories: {
		notFound: 'La categoría no fue encontrada.',
		duplicateName: 'Ya existe una categoría con ese nombre.',
	},
	reasons: {
		notFound: 'El motivo no fue encontrado.',
		invalidParent: 'El motivo padre no es válido.',
	},
	roles: {
		notFound: 'El rol no fue encontrado.',
		systemNotEditable: 'Los roles base no se pueden editar.',
		systemNotDeletable: 'Los roles base no se pueden eliminar.',
		systemNotReorderable: 'Los roles base no se pueden mover.',
		reorderBoundary: 'El rol ya se encuentra en el límite permitido.',
		assignedNotDeletable:
			'No puedes eliminar un rol que ya está asignado a usuarios.',
		createFailed: 'No se pudo crear el rol. Inténtalo nuevamente.',
		updateFailed: 'No se pudo actualizar el rol. Inténtalo nuevamente.',
		deleteFailed: 'No se pudo eliminar el rol. Inténtalo nuevamente.',
		reorderFailed: 'No se pudo mover el rol. Inténtalo nuevamente.',
		duplicateName: 'Ya existe un rol con ese nombre.',
	},
	permissions: {
		invalidSelection: 'Uno de los permisos seleccionados no es válido.',
		beyondActor: 'Solo puedes asignar permisos que tu usuario ya posee.',
	},
	users: {
		notFound: 'El usuario no fue encontrado.',
		invalidInvitationData: 'Datos de invitación inválidos.',
		ssoDisabled: 'El acceso SSO no está habilitado.',
		invalidRole: 'El rol seleccionado no es válido.',
		roleBeyondActorPermissions:
			'No puedes asignar un rol con permisos que tu usuario no posee.',
		roleLevelAboveActor:
			'Solo puedes asignar roles de nivel inferior al tuyo.',
		cannotEditSuperAdmin:
			'No se puede modificar el acceso de un super administrador.',
		cannotManageHigherLevelUser:
			'No puedes gestionar a un usuario con un rol de nivel superior al tuyo.',
		storeAccessBeyondActor:
			'No puedes otorgar acceso a tiendas que tu usuario no tiene asignadas.',
		emailAlreadyMember: 'Ese correo ya pertenece a esta organización.',
		emailHasAccountInviteOnly:
			'Ese correo ya tiene una cuenta registrada. Por ahora solo se admiten usuarios nuevos por invitación.',
		emailHasAccountNewInvitation:
			'Ese correo ya tiene una cuenta registrada. Solicita una nueva invitación con otro correo.',
		passwordSignupDisabled:
			'La creación de cuentas con contraseña está deshabilitada.',
		invitationExpired: 'La invitación ha expirado.',
		invitationNotFound: 'La invitación no fue encontrada.',
		invitationNotActive: 'La invitación ya no está activa.',
		invitationUnavailable: 'La invitación ya no está disponible.',
		cannotEditOwnAccess:
			'No puedes editar tu propio acceso desde este módulo.',
		cannotRemoveSelf: 'No puedes retirarte a ti mismo de la organización.',
		invitationAcceptFailed:
			'No se pudo aceptar la invitación. Inténtalo nuevamente.',
		accessUpdateFailed: 'No se pudo actualizar el acceso del usuario.',
		registrationFailedRetry:
			'No se pudo completar el registro. Inténtalo nuevamente.',
		registrationFailed: 'No se pudo completar el registro.',
		invitationCreateFailed:
			'No se pudo crear la invitación. Inténtalo nuevamente.',
		emailSendFailed:
			'No se pudo enviar el correo. Verifica la configuración de email.',
		memberRemoveFailed: 'No se pudo retirar al usuario de la organización.',
		invitationRevokeFailed: 'No se pudo revocar la invitación.',
		invalidStores: 'Una o más tiendas seleccionadas no son válidas.',
		alreadyMember: 'Ya perteneces a esta organización.',
	},
	webhooks: {
		notFound: 'El webhook no fue encontrado.',
		deletedNotEditable: 'El webhook está eliminado y no se puede editar.',
		alreadyDeleted: 'El webhook ya está eliminado.',
		createFailed: 'No se pudo crear el webhook. Inténtalo nuevamente.',
		updateFailed: 'No se pudo actualizar el webhook. Inténtalo nuevamente.',
		deleteFailed: 'No se pudo eliminar el webhook. Inténtalo nuevamente.',
	},
	complaints: {
		invalidStoreData: 'Datos de tienda inválidos.',
		incompleteClaimantData: 'Datos del reclamante incompletos.',
		formUnavailable:
			'El formulario de reclamos no está disponible actualmente.',
		invalidReason: 'Motivo de reclamo no válido.',
		typeRequired: 'Tipo de reclamo requerido.',
		captchaFailed:
			'Verificación de seguridad fallida. Recarga la página e intenta nuevamente.',
		notFound: 'Reclamo no encontrado.',
		notFoundShort: 'Reclamo no encontrado',
		noAccess: 'No tienes acceso a este reclamo.',
		attachmentNotFound: 'Archivo no encontrado o sin acceso.',
		alreadyResolved: 'El reclamo ya fue resuelto.',
		sameStatus: 'El reclamo ya tiene ese estado.',
		alreadyHasResponse: 'El reclamo ya tiene respuesta oficial.',
		alreadyHasResponseRegistered:
			'Este reclamo ya tiene una respuesta registrada',
		statusChangeFailed: 'Error al cambiar el estado. Intenta de nuevo.',
		responseSaveFailed: 'Error al guardar la respuesta. Intenta de nuevo.',
		invalidCategory: 'La categoría seleccionada no es válida.',
		invalidPriority: 'La prioridad seleccionada no es válida.',
		priorityCategorySaveFailed:
			'No se pudieron guardar la prioridad y la categoría.',
		responseEmpty: 'La respuesta no puede estar vacía',
		trackingCodeRequired: 'Ingresa tu código de seguimiento',
		trackingNotFound:
			'No encontramos ningún reclamo con ese código. Verifica que esté escrito correctamente.',
	},
	settings: {
		testEmailRequired: 'Debes indicar un correo de destino.',
		membershipNotFound: 'No se encontró una membresía válida.',
		organizationNotFound: 'No se encontró una organización asociada.',
		organizationUpdateFailed:
			'No se pudo actualizar la organización. Inténtalo nuevamente.',
		logoRemoveFailed: 'No se pudo quitar el logo. Inténtalo nuevamente.',
		organizationEditDenied:
			'No tienes permisos para editar la organización.',
		smtpTestDenied: 'No tienes permisos para ejecutar esta prueba.',
	},
	exports: {
		accessDenied: 'No tienes permisos para acceder a las exportaciones.',
	},
} as const
