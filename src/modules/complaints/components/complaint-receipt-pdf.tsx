import {
	Document,
	Page,
	renderToBuffer,
	StyleSheet,
	Text,
	View,
} from '@react-pdf/renderer'
import type { ReactNode } from 'react'

const FALLBACK_ACCENT = '#0B5FFF'

const styles = StyleSheet.create({
	page: {
		paddingTop: 20,
		paddingRight: 20,
		paddingBottom: 18,
		paddingLeft: 20,
		backgroundColor: '#FFFFFF',
		color: '#0F172A',
		fontSize: 9,
		lineHeight: 1.28,
	},
	header: {
		marginBottom: 8,
	},
	headerTop: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 10,
	},
	headerBrand: {
		flexGrow: 1,
		flexShrink: 1,
	},
	eyebrow: {
		marginBottom: 2,
		fontSize: 6.6,
		fontWeight: 700,
		letterSpacing: 0.7,
		textTransform: 'uppercase',
	},
	headerTitle: {
		marginBottom: 5.5,
		fontSize: 15.5,
		fontWeight: 700,
	},
	headerSubtitle: {
		marginBottom: 1.5,
		fontSize: 9.2,
		fontWeight: 700,
	},
	headerLegal: {
		color: '#475569',
		fontSize: 7.8,
		marginBottom: 1.5,
	},
	headerCompanyMeta: {
		fontSize: 7.6,
		color: '#475569',
		lineHeight: 1.35,
	},
	receiptBadge: {
		width: 110,
		borderRadius: 12,
		backgroundColor: '#F8FAFC',
		paddingTop: 7,
		paddingRight: 8,
		paddingBottom: 8,
		paddingLeft: 8,
	},
	badgeLabel: {
		marginBottom: 2,
		fontSize: 6.2,
		fontWeight: 700,
		letterSpacing: 0.5,
		color: '#64748B',
		textTransform: 'uppercase',
	},
	badgeCorrelative: {
		fontSize: 15,
		fontWeight: 700,
	},
	metaGrid: {
		marginTop: 8,
		flexDirection: 'row',
		gap: 8,
	},
	metaCard: {
		flexGrow: 1,
		flexBasis: 0,
		borderRadius: 12,
		backgroundColor: '#F8FAFC',
		paddingTop: 6,
		paddingRight: 7,
		paddingBottom: 6,
		paddingLeft: 7,
	},
	metaLabel: {
		marginBottom: 2,
		fontSize: 6.8,
		fontWeight: 700,
		letterSpacing: 0.5,
		color: '#64748B',
		textTransform: 'uppercase',
	},
	metaValue: {
		fontSize: 9.2,
		fontWeight: 600,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	column: {
		width: '48.9%',
	},
	section: {
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 14,
		padding: 9,
	},
	sectionHeader: {
		marginBottom: 7,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	sectionNumber: {
		minWidth: 16,
		borderRadius: 999,
		paddingTop: 2,
		paddingRight: 5,
		paddingBottom: 2,
		paddingLeft: 5,
		backgroundColor: '#E2E8F0',
		fontSize: 7.5,
		fontWeight: 700,
		textAlign: 'center',
	},
	sectionTitle: {
		fontSize: 10,
		fontWeight: 700,
	},
	field: {
		marginBottom: 5,
	},
	fieldLabel: {
		marginBottom: 1,
		fontSize: 6.8,
		fontWeight: 700,
		letterSpacing: 0.4,
		color: '#64748B',
		textTransform: 'uppercase',
	},
	fieldValue: {
		fontSize: 8.7,
	},
	fieldValueStrong: {
		fontSize: 9,
		fontWeight: 600,
	},
	narrativeRow: {
		flexDirection: 'row',
		gap: 8,
	},
	narrativeCard: {
		flexGrow: 1,
		flexBasis: 0,
		borderRadius: 12,
		backgroundColor: '#F8FAFC',
		padding: 8,
	},
	narrativeTitle: {
		marginBottom: 4,
		fontSize: 7,
		fontWeight: 700,
		letterSpacing: 0.5,
		color: '#64748B',
		textTransform: 'uppercase',
	},
	narrativeText: {
		fontSize: 8.5,
		lineHeight: 1.35,
	},
	narrativeTextCompact: {
		fontSize: 8,
		lineHeight: 1.28,
	},
	alertBox: {
		marginBottom: 8,
		borderRadius: 12,
		backgroundColor: '#F8FAFC',
		paddingTop: 8,
		paddingRight: 9,
		paddingBottom: 8,
		paddingLeft: 9,
	},
	alertText: {
		fontSize: 8.4,
		lineHeight: 1.32,
		color: '#334155',
	},
	footer: {
		marginTop: 2,
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
		paddingTop: 8,
	},
	footerText: {
		fontSize: 7.2,
		color: '#64748B',
		lineHeight: 1.35,
	},
})

export interface ComplaintReceiptPdfInput {
	accentColor: string | null
	organization: {
		name: string
		legalName: string
		taxId: string
		address: string
		location: string
		contact: string
		website: string | null
	}
	store: {
		name: string
		detail: string
		modeLabel: string
	}
	consumer: {
		heading: string
		identity: string
		representative: string | null
		contact: string
		address: string
	}
	complaint: {
		createdAt: string
		responseDeadline: string
		typeLabel: string
		typeDescription: string
		reason: string
		correlative: string
		trackingCode: string
		incidentDate: string
		itemSummary: string
		amount: string
		proofOfPayment: string
	}
	narratives: {
		detail: string
		request: string
		attachments: string
		providerActions: string
	}
}

function getSafeAccentColor(value: string | null) {
	if (!value) return FALLBACK_ACCENT

	const normalizedValue = value.trim()
	if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalizedValue)) {
		return normalizedValue
	}

	return FALLBACK_ACCENT
}

function getNarrativeStyle(value: string) {
	return value.length > 320
		? [styles.narrativeText, styles.narrativeTextCompact]
		: styles.narrativeText
}

function Field({
	label,
	value,
	strong = false,
}: {
	label: string
	value: string
	strong?: boolean
}) {
	return (
		<View style={styles.field}>
			<Text style={styles.fieldLabel}>{label}</Text>
			<Text style={strong ? styles.fieldValueStrong : styles.fieldValue}>
				{value}
			</Text>
		</View>
	)
}

function Section({
	number,
	title,
	children,
}: {
	number: string
	title: string
	children: ReactNode
}) {
	return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionNumber}>{number}</Text>
				<Text style={styles.sectionTitle}>{title}</Text>
			</View>
			{children}
		</View>
	)
}

function ComplaintReceiptPdf({ data }: { data: ComplaintReceiptPdfInput }) {
	const accentColor = getSafeAccentColor(data.accentColor)
	const shouldShowLegalName =
		data.organization.legalName.trim() !== data.organization.name.trim()

	return (
		<Document
			title={`Constancia de reclamo ${data.complaint.correlative}`}
			author='Open Reclamos'
			subject='Constancia de recepción de reclamo'
		>
			<Page size='A4' style={styles.page}>
				<View style={styles.header}>
					<View style={styles.headerTop}>
						<View style={styles.headerBrand}>
							<Text
								style={[styles.eyebrow, { color: accentColor }]}
							>
								Libro de Reclamaciones
							</Text>
							<Text style={styles.headerTitle}>
								Constancia de recepción
							</Text>
							<Text style={styles.headerSubtitle}>
								{data.organization.name}
							</Text>
							{shouldShowLegalName && (
								<Text style={styles.headerLegal}>
									{data.organization.legalName}
								</Text>
							)}
							<Text style={styles.headerCompanyMeta}>
								RUC {data.organization.taxId} •{' '}
								{data.organization.address}
							</Text>
						</View>

						<View style={styles.receiptBadge}>
							<Text style={styles.badgeLabel}>Correlativo</Text>
							<Text
								style={[
									styles.badgeCorrelative,
									{ color: accentColor },
								]}
							>
								{data.complaint.correlative}
							</Text>
						</View>
					</View>

					<View style={styles.metaGrid}>
						<View style={styles.metaCard}>
							<Text style={styles.metaLabel}>
								Fecha de registro
							</Text>
							<Text style={styles.metaValue}>
								{data.complaint.createdAt}
							</Text>
						</View>
						<View style={styles.metaCard}>
							<Text style={styles.metaLabel}>
								Plazo máximo de respuesta
							</Text>
							<Text style={styles.metaValue}>
								{data.complaint.responseDeadline}
							</Text>
						</View>
						<View style={styles.metaCard}>
							<Text style={styles.metaLabel}>Tipo</Text>
							<Text style={styles.metaValue}>
								{data.complaint.typeLabel}
							</Text>
						</View>
						<View style={styles.metaCard}>
							<Text style={styles.metaLabel}>
								Código de seguimiento
							</Text>
							<Text style={styles.metaValue}>
								{data.complaint.trackingCode}
							</Text>
						</View>
					</View>
				</View>

				<View style={styles.grid}>
					<View style={styles.column}>
						<Section number='1' title='Proveedor'>
							<Field
								label='Razón social'
								value={data.organization.legalName}
								strong
							/>
							<Field
								label='RUC'
								value={data.organization.taxId}
								strong
							/>
							<Field
								label='Dirección'
								value={data.organization.address}
							/>
							<Field
								label='Ubicación'
								value={data.organization.location}
							/>
							<Field
								label='Contacto'
								value={data.organization.contact}
							/>
						</Section>

						<Section number='2' title='Consumidor reclamante'>
							<Field
								label='Nombre o razón social'
								value={data.consumer.heading}
								strong
							/>
							<Field
								label='Documento'
								value={data.consumer.identity}
							/>
							{data.consumer.representative && (
								<Field
									label='Representante o tutor'
									value={data.consumer.representative}
								/>
							)}
							<Field
								label='Contacto'
								value={data.consumer.contact}
							/>
							<Field
								label='Domicilio'
								value={data.consumer.address}
							/>
						</Section>
					</View>

					<View style={styles.column}>
						<Section number='3' title='Bien o servicio involucrado'>
							<Field
								label='Tienda o canal'
								value={data.store.name}
								strong
							/>
							<Field
								label='Modalidad'
								value={data.store.modeLabel}
							/>
							<Field label='Detalle' value={data.store.detail} />
							<Field
								label='Motivo'
								value={data.complaint.reason}
							/>
							<Field
								label='Fecha del incidente'
								value={data.complaint.incidentDate}
							/>
							<Field
								label='Bien contratado'
								value={data.complaint.itemSummary}
							/>
							<Field
								label='Monto reclamado'
								value={data.complaint.amount}
							/>
							<Field
								label='Comprobante de pago'
								value={data.complaint.proofOfPayment}
							/>
						</Section>

						<View style={styles.alertBox}>
							<Text style={styles.alertText}>
								{data.narratives.attachments}
							</Text>
						</View>
					</View>
				</View>

				<Section number='5' title='Detalle y pedido del consumidor'>
					<View style={styles.narrativeRow}>
						<View style={styles.narrativeCard}>
							<Text style={styles.narrativeTitle}>Detalle</Text>
							<Text
								style={getNarrativeStyle(
									data.narratives.detail,
								)}
							>
								{data.narratives.detail}
							</Text>
						</View>
						<View style={styles.narrativeCard}>
							<Text style={styles.narrativeTitle}>
								Pedido del consumidor
							</Text>
							<Text
								style={getNarrativeStyle(
									data.narratives.request,
								)}
							>
								{data.narratives.request}
							</Text>
						</View>
					</View>
				</Section>

				<Section
					number='6'
					title='Observaciones y acciones del proveedor'
				>
					<Text style={styles.fieldValue}>
						{data.narratives.providerActions}
					</Text>
				</Section>

				<View style={styles.footer}>
					<Text style={styles.footerText}>
						Constancia generada automáticamente por Open Reclamos.
						La presentación del reclamo o queja no limita el acceso
						a otras vías de solución de controversias ni constituye
						un requisito previo para acudir al INDECOPI.
					</Text>
				</View>
			</Page>
		</Document>
	)
}

export async function renderComplaintReceiptPdfBuffer(
	data: ComplaintReceiptPdfInput,
) {
	return renderToBuffer(<ComplaintReceiptPdf data={data} />)
}
