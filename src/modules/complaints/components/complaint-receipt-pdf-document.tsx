import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ReactNode } from 'react'

const styles = StyleSheet.create({
	page: {
		paddingTop: 22,
		paddingRight: 22,
		paddingBottom: 20,
		paddingLeft: 22,
		backgroundColor: '#FFFFFF',
		color: '#111827',
		fontSize: 8.5,
		lineHeight: 1.3,
	},
	// ── Header ──────────────────────────────────────────────────
	header: {
		marginBottom: 8,
	},
	headerTopRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 10,
		marginBottom: 3,
	},
	headerBrand: {
		flexGrow: 1,
	},
	eyebrow: {
		fontSize: 6.5,
		fontWeight: 700,
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		color: '#9CA3AF',
	},
	headerTitle: {
		fontSize: 14,
		fontWeight: 700,
		color: '#111827',
	},
	headerCorrelativeBox: {
		alignItems: 'flex-end',
		justifyContent: 'center',
	},
	headerCorrelativeLabel: {
		fontSize: 6.2,
		fontWeight: 700,
		letterSpacing: 0.5,
		textTransform: 'uppercase',
		color: '#6B7280',
	},
	headerCorrelative: {
		fontSize: 14,
		fontWeight: 700,
		color: '#111827',
	},
	headerRule: {
		borderBottomWidth: 2,
		borderBottomColor: '#374151',
		marginBottom: 5,
		marginTop: 5,
	},
	headerOrgLine: {
		fontSize: 8,
		color: '#374151',
		marginBottom: 5,
	},
	// ── Meta strip ──────────────────────────────────────────────
	metaStrip: {
		flexDirection: 'row',
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: '#D1D5DB',
	},
	metaCell: {
		flexGrow: 1,
		flexBasis: 0,
		paddingTop: 4,
		paddingBottom: 4,
		paddingLeft: 6,
		paddingRight: 6,
	},
	metaCellBorder: {
		flexGrow: 1,
		flexBasis: 0,
		paddingTop: 4,
		paddingBottom: 4,
		paddingLeft: 6,
		paddingRight: 6,
		borderLeftWidth: 1,
		borderLeftColor: '#D1D5DB',
	},
	metaCellLabel: {
		fontSize: 5.8,
		fontWeight: 700,
		textTransform: 'uppercase',
		letterSpacing: 0.4,
		color: '#9CA3AF',
		marginBottom: 1,
	},
	metaCellValue: {
		fontSize: 8,
		fontWeight: 700,
		color: '#111827',
	},
	// ── Main grid ───────────────────────────────────────────────
	grid: {
		flexDirection: 'row',
		gap: 6,
	},
	column: {
		width: '49%',
	},
	// ── Sections ────────────────────────────────────────────────
	section: {
		marginBottom: 6,
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 2,
	},
	sectionTitleBar: {
		backgroundColor: '#F3F4F6',
		paddingTop: 4,
		paddingBottom: 0,
		paddingLeft: 7,
		paddingRight: 7,
		borderBottomWidth: 1,
		borderBottomColor: '#D1D5DB',
		justifyContent: 'center',
	},
	sectionTitle: {
		fontSize: 7,
		fontWeight: 700,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		color: '#374151',
	},
	sectionBody: {
		paddingTop: 5,
		paddingBottom: 5,
		paddingLeft: 7,
		paddingRight: 7,
		gap: 4,
	},
	// ── Fields ──────────────────────────────────────────────────
	fieldLabel: {
		fontSize: 6,
		fontWeight: 700,
		textTransform: 'uppercase',
		letterSpacing: 0.4,
		color: '#6B7280',
		marginBottom: 1,
	},
	fieldValue: {
		fontSize: 8.2,
		color: '#111827',
	},
	fieldValueStrong: {
		fontSize: 8.2,
		fontWeight: 700,
		color: '#111827',
	},
	// ── Narrative section ────────────────────────────────────────
	narrativeRow: {
		flexDirection: 'row',
	},
	narrativeColLeft: {
		flexGrow: 1,
		flexBasis: 0,
		paddingTop: 5,
		paddingBottom: 5,
		paddingLeft: 7,
		paddingRight: 7,
	},
	narrativeColRight: {
		flexGrow: 1,
		flexBasis: 0,
		paddingTop: 5,
		paddingBottom: 5,
		paddingLeft: 7,
		paddingRight: 7,
		borderLeftWidth: 1,
		borderLeftColor: '#D1D5DB',
	},
	narrativeColLabel: {
		fontSize: 6,
		fontWeight: 700,
		textTransform: 'uppercase',
		letterSpacing: 0.4,
		color: '#6B7280',
		marginBottom: 3,
	},
	narrativeText: {
		fontSize: 8.2,
		color: '#111827',
		lineHeight: 1.35,
	},
	narrativeTextCompact: {
		fontSize: 7.8,
		lineHeight: 1.3,
	},
	// ── Attachments note ─────────────────────────────────────────
	attachmentsNote: {
		marginBottom: 6,
		paddingTop: 3,
		paddingBottom: 3,
		paddingLeft: 7,
		paddingRight: 7,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 2,
		backgroundColor: '#F9FAFB',
	},
	attachmentsNoteText: {
		fontSize: 7.2,
		color: '#6B7280',
	},
	// ── Provider section ─────────────────────────────────────────
	providerSection: {
		marginBottom: 6,
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 2,
	},
	providerSectionResponse: {
		marginBottom: 6,
		borderWidth: 1,
		borderColor: '#86EFAC',
		borderRadius: 2,
	},
	providerTitleBar: {
		backgroundColor: '#F3F4F6',
		paddingTop: 4,
		paddingLeft: 7,
		paddingRight: 7,
		borderBottomWidth: 1,
		borderBottomColor: '#D1D5DB',
		justifyContent: 'center',
	},
	providerTitleBarResponse: {
		backgroundColor: '#DCFCE7',
		paddingTop: 4,
		paddingLeft: 7,
		paddingRight: 7,
		borderBottomWidth: 1,
		borderBottomColor: '#86EFAC',
		justifyContent: 'center',
	},
	providerTitle: {
		fontSize: 7,
		fontWeight: 700,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		color: '#374151',
	},
	providerTitleResponse: {
		fontSize: 7,
		fontWeight: 700,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		color: '#166534',
	},
	providerBody: {
		paddingTop: 6,
		paddingBottom: 6,
		paddingLeft: 7,
		paddingRight: 7,
	},
	providerText: {
		fontSize: 8.2,
		color: '#374151',
		lineHeight: 1.35,
	},
	providerTextResponse: {
		fontSize: 8.2,
		color: '#166534',
		lineHeight: 1.35,
	},
	// ── Footer ───────────────────────────────────────────────────
	footer: {
		marginTop: 4,
		borderTopWidth: 1,
		borderTopColor: '#D1D5DB',
		paddingTop: 5,
	},
	footerText: {
		fontSize: 6.5,
		color: '#9CA3AF',
		lineHeight: 1.3,
		textAlign: 'center',
	},
})

export interface ComplaintReceiptPdfInput {
	accentColor: string | null
	document: {
		title: string
		subject: string
		footerNote: string
	}
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
	}
	providerSection: {
		title: string
		content: string
		tone: 'default' | 'response'
	}
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
		<View>
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
			<View style={styles.sectionTitleBar}>
				<Text style={styles.sectionTitle}>
					{number}. {title}
				</Text>
			</View>
			<View style={styles.sectionBody}>{children}</View>
		</View>
	)
}

export function ComplaintReceiptPdfPage({
	data,
}: {
	data: ComplaintReceiptPdfInput
}) {
	const shouldShowLegalName =
		data.organization.legalName.trim() !== data.organization.name.trim()

	const orgLine = [
		data.organization.name,
		shouldShowLegalName ? data.organization.legalName : null,
		`RUC ${data.organization.taxId}`,
		data.organization.address,
	]
		.filter(Boolean)
		.join('  ·  ')

	const isResponseTone = data.providerSection.tone === 'response'

	return (
		<Page size='A4' style={styles.page}>
			{/* Header */}
			<View style={styles.header}>
				<View style={styles.headerTopRow}>
					<View style={styles.headerBrand}>
						<Text style={styles.eyebrow}>
							Libro de Reclamaciones Virtual
						</Text>
						<Text style={styles.headerTitle}>
							{data.document.title}
						</Text>
					</View>
					<View style={styles.headerCorrelativeBox}>
						<Text style={styles.headerCorrelativeLabel}>
							N.° Correlativo
						</Text>
						<Text style={styles.headerCorrelative}>
							{data.complaint.correlative}
						</Text>
					</View>
				</View>

				<View style={styles.headerRule} />

				<Text style={styles.headerOrgLine}>{orgLine}</Text>

				<View style={styles.metaStrip}>
					<View style={styles.metaCell}>
						<Text style={styles.metaCellLabel}>
							Fecha de registro
						</Text>
						<Text style={styles.metaCellValue}>
							{data.complaint.createdAt}
						</Text>
					</View>
					<View style={styles.metaCellBorder}>
						<Text style={styles.metaCellLabel}>Tipo</Text>
						<Text style={styles.metaCellValue}>
							{data.complaint.typeLabel}
						</Text>
					</View>
					<View style={styles.metaCellBorder}>
						<Text style={styles.metaCellLabel}>
							Código de seguimiento
						</Text>
						<Text style={styles.metaCellValue}>
							{data.complaint.trackingCode}
						</Text>
					</View>
					<View style={styles.metaCellBorder}>
						<Text style={styles.metaCellLabel}>
							Plazo máximo de respuesta
						</Text>
						<Text style={styles.metaCellValue}>
							{data.complaint.responseDeadline}
						</Text>
					</View>
				</View>
			</View>

			{/* 2-column grid: Proveedor + Consumidor | Bien o servicio */}
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

					<View style={styles.attachmentsNote}>
						<Text style={styles.attachmentsNoteText}>
							{data.narratives.attachments}
						</Text>
					</View>
				</View>
			</View>

			{/* Detalle y pedido — full width, split in 2 */}
			<View style={styles.section}>
				<View style={styles.sectionTitleBar}>
					<Text style={styles.sectionTitle}>
						4. Detalle y pedido del consumidor
					</Text>
				</View>
				<View style={styles.narrativeRow}>
					<View style={styles.narrativeColLeft}>
						<Text style={styles.narrativeColLabel}>
							Detalle
						</Text>
						<Text
							style={getNarrativeStyle(
								data.narratives.detail,
							)}
						>
							{data.narratives.detail}
						</Text>
					</View>
					<View style={styles.narrativeColRight}>
						<Text style={styles.narrativeColLabel}>
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
			</View>

			{/* Respuesta del proveedor */}
			<View
				style={
					isResponseTone
						? styles.providerSectionResponse
						: styles.providerSection
				}
			>
				<View
					style={
						isResponseTone
							? styles.providerTitleBarResponse
							: styles.providerTitleBar
					}
				>
					<Text
						style={
							isResponseTone
								? styles.providerTitleResponse
								: styles.providerTitle
						}
					>
						5. {data.providerSection.title}
					</Text>
				</View>

				<View style={styles.providerBody}>
					<Text
						style={
							isResponseTone
								? styles.providerTextResponse
								: styles.providerText
						}
					>
						{data.providerSection.content}
					</Text>
				</View>
			</View>

			{/* Footer */}
			<View style={styles.footer}>
				<Text style={styles.footerText}>
					{data.document.footerNote}
				</Text>
			</View>
		</Page>
	)
}

export function ComplaintReceiptPdfDocument({
	data,
}: {
	data: ComplaintReceiptPdfInput
}) {
	return (
		<Document
			title={`${data.document.title} ${data.complaint.correlative}`}
			author='Open Reclamos'
			subject={data.document.subject}
		>
			<ComplaintReceiptPdfPage data={data} />
		</Document>
	)
}
