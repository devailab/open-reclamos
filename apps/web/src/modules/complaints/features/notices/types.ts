export interface NoticeStoreOption {
	id: string
	name: string
	url: string
}

export interface NoticeContext {
	defaultQrUrl: string
	stores: NoticeStoreOption[]
}

export interface NoticesRecord {
	organization_url: string
	stores: { store_id: string; name: string; url: string }[]
}
