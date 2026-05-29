import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ComplaintReceiptPdfInput } from '@/modules/complaints/components/complaint-receipt-pdf-document'
import { ComplaintReceiptPdfPage } from '@/modules/complaints/components/complaint-receipt-pdf-document'

const coverStyles = StyleSheet.create({
	page: {
		paddingTop: 0,
		paddingRight: 0,
		paddingBottom: 0,
		paddingLeft: 0,
		backgroundColor: '#FFFFFF',
		color: '#111827',
	},
	accentBar: {
		height: 8,
		backgroundColor: '#2563EB',
	},
	body: {
		paddingTop: 56,
		paddingRight: 48,
		paddingBottom: 48,
		paddingLeft: 48,
		flexGrow: 1,
		flexDirection: 'column',
		justifyContent: 'space-between',
	},
	eyebrow: {
		fontSize: 8,
		fontWeight: 700,
		letterSpacing: 1.5,
		textTransform: 'uppercase',
		color: '#9CA3AF',
		marginBottom: 12,
	},
	mainTitle: {
		fontSize: 32,
		fontWeight: 700,
		color: '#111827',
		lineHeight: 1.15,
		marginBottom: 40,
	},
	divider: {
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
		marginBottom: 32,
	},
	metaGrid: {
		flexDirection: 'row',
		gap: 0,
		marginBottom: 40,
	},
	metaBlock: {
		flexGrow: 1,
		flexBasis: 0,
		paddingRight: 24,
	},
	metaBlockBorder: {
		flexGrow: 1,
		flexBasis: 0,
		paddingLeft: 24,
		paddingRight: 24,
		borderLeftWidth: 1,
		borderLeftColor: '#E5E7EB',
	},
	metaLabel: {
		fontSize: 6.5,
		fontWeight: 700,
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		color: '#6B7280',
		marginBottom: 4,
	},
	metaValue: {
		fontSize: 11,
		fontWeight: 700,
		color: '#111827',
	},
	metaValueLarge: {
		fontSize: 18,
		fontWeight: 700,
		color: '#111827',
	},
	orgSection: {
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
		paddingTop: 20,
		marginTop: 8,
	},
	orgLabel: {
		fontSize: 6.5,
		fontWeight: 700,
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		color: '#6B7280',
		marginBottom: 6,
	},
	orgName: {
		fontSize: 14,
		fontWeight: 700,
		color: '#111827',
		marginBottom: 3,
	},
	orgDetail: {
		fontSize: 8.5,
		color: '#6B7280',
	},
	generatedNote: {
		marginTop: 24,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: '#F3F4F6',
	},
	generatedText: {
		fontSize: 6.5,
		color: '#9CA3AF',
		lineHeight: 1.4,
	},
	bottomBar: {
		height: 4,
		backgroundColor: '#F3F4F6',
	},
})

interface CoverPageProps {
	organization: {
		name: string
		legalName: string
		taxId: string
	}
	storeName: string
	periodStart: string
	periodEnd: string
	totalComplaints: number
	generatedAt: string
	accentColor: string | null
}

function CoverPage({
	organization,
	storeName,
	periodStart,
	periodEnd,
	totalComplaints,
	generatedAt,
	accentColor,
}: CoverPageProps) {
	const barColor = accentColor ?? '#2563EB'

	return (
		<Page size='A4' style={coverStyles.page}>
			<View
				style={[coverStyles.accentBar, { backgroundColor: barColor }]}
			/>

			<View style={coverStyles.body}>
				<View>
					<Text style={coverStyles.eyebrow}>
						Libro de Reclamaciones Virtual
					</Text>
					<Text style={coverStyles.mainTitle}>
						Libro de Reclamaciones
					</Text>

					<View style={coverStyles.divider} />

					<View style={coverStyles.metaGrid}>
						<View style={coverStyles.metaBlock}>
							<Text style={coverStyles.metaLabel}>
								Total de registros
							</Text>
							<Text style={coverStyles.metaValueLarge}>
								{totalComplaints}
							</Text>
						</View>
						<View style={coverStyles.metaBlockBorder}>
							<Text style={coverStyles.metaLabel}>
								Período exportado
							</Text>
							<Text style={coverStyles.metaValue}>
								{periodStart} — {periodEnd}
							</Text>
						</View>
						<View style={coverStyles.metaBlockBorder}>
							<Text style={coverStyles.metaLabel}>Tienda</Text>
							<Text style={coverStyles.metaValue}>
								{storeName}
							</Text>
						</View>
					</View>

					<View style={coverStyles.orgSection}>
						<Text style={coverStyles.orgLabel}>Proveedor</Text>
						<Text style={coverStyles.orgName}>
							{organization.name}
						</Text>
						<Text style={coverStyles.orgDetail}>
							{organization.legalName} · RUC {organization.taxId}
						</Text>
					</View>

					<View style={coverStyles.generatedNote}>
						<Text style={coverStyles.generatedText}>
							Generado el {generatedAt} por Open Reclamos
						</Text>
					</View>
				</View>
			</View>

			<View style={coverStyles.bottomBar} />
		</Page>
	)
}

export interface ExportBookPdfInput {
	organization: {
		name: string
		legalName: string
		taxId: string
		primaryColor: string | null
	}
	storeName: string
	periodStart: string
	periodEnd: string
	generatedAt: string
	complaints: ComplaintReceiptPdfInput[]
}

export function ExportBookPdfDocument({ data }: { data: ExportBookPdfInput }) {
	return (
		<Document
			title={`Registro de Reclamos — ${data.organization.name} — ${data.periodStart} a ${data.periodEnd}`}
			author='Open Reclamos'
			subject='Exportación oficial del Libro de Reclamaciones Virtual para INDECOPI'
		>
			<CoverPage
				organization={data.organization}
				storeName={data.storeName}
				periodStart={data.periodStart}
				periodEnd={data.periodEnd}
				totalComplaints={data.complaints.length}
				generatedAt={data.generatedAt}
				accentColor={data.organization.primaryColor}
			/>

			{data.complaints.map((complaint) => (
				<ComplaintReceiptPdfPage
					key={complaint.complaint.correlative}
					data={complaint}
				/>
			))}
		</Document>
	)
}
