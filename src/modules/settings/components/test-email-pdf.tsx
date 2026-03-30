import {
	Document,
	Page,
	renderToBuffer,
	StyleSheet,
	Text,
	View,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
	page: {
		paddingTop: 40,
		paddingRight: 36,
		paddingBottom: 40,
		paddingLeft: 36,
		backgroundColor: '#FFFFFF',
		color: '#111827',
		fontSize: 12,
		lineHeight: 1.6,
	},
	badge: {
		alignSelf: 'flex-start',
		marginBottom: 14,
		paddingTop: 4,
		paddingRight: 10,
		paddingBottom: 4,
		paddingLeft: 10,
		borderRadius: 999,
		backgroundColor: '#E0F2FE',
		color: '#075985',
		fontSize: 10,
		fontWeight: 700,
	},
	title: {
		marginBottom: 8,
		fontSize: 20,
		fontWeight: 700,
	},
	description: {
		marginBottom: 18,
		color: '#4B5563',
	},
	panel: {
		marginBottom: 18,
		padding: 16,
		borderRadius: 12,
		border: '1 solid #E5E7EB',
		backgroundColor: '#F9FAFB',
	},
	panelTitle: {
		marginBottom: 6,
		fontSize: 13,
		fontWeight: 700,
	},
	panelText: {
		color: '#374151',
	},
	footer: {
		marginTop: 24,
		paddingTop: 12,
		borderTop: '1 solid #E5E7EB',
		fontSize: 10,
		color: '#6B7280',
	},
})

interface TestEmailPdfProps {
	organizationName: string
	recipientEmail: string
	generatedAt: string
}

export function TestEmailPdf({
	organizationName,
	recipientEmail,
	generatedAt,
}: TestEmailPdfProps) {
	return (
		<Document
			title='Prueba de correo Open Reclamos'
			author='Open Reclamos'
			subject='Correo de prueba con PDF adjunto'
		>
			<Page size='A4' style={styles.page}>
				<Text style={styles.badge}>Prueba de correo</Text>

				<Text style={styles.title}>
					Correo de prueba enviado correctamente
				</Text>
				<Text style={styles.description}>
					Este es un correo de prueba con un PDF adjunto.
				</Text>

				<View style={styles.panel}>
					<Text style={styles.panelTitle}>Detalles</Text>
					<Text style={styles.panelText}>
						Organización: {organizationName}
					</Text>
					<Text style={styles.panelText}>
						Destinatario: {recipientEmail}
					</Text>
					<Text style={styles.panelText}>
						Fecha de generación: {generatedAt}
					</Text>
				</View>

				<View style={styles.panel}>
					<Text style={styles.panelTitle}>Resultado esperado</Text>
					<Text style={styles.panelText}>
						Si recibiste este archivo adjunto, la configuración SMTP
						y la generación de PDF del proyecto están funcionando.
					</Text>
				</View>

				<Text style={styles.footer}>
					Open Reclamos generó este documento automáticamente como
					parte de la prueba de configuración de correo.
				</Text>
			</Page>
		</Document>
	)
}

export async function renderTestEmailPdfBuffer(params: TestEmailPdfProps) {
	return renderToBuffer(<TestEmailPdf {...params} />)
}
