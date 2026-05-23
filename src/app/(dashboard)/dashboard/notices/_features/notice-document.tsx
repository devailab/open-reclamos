import {
	Document,
	G,
	Image,
	Page,
	Path,
	StyleSheet,
	Svg,
	Text,
	View,
} from '@react-pdf/renderer'
import type { Orientation } from './use-notice-state'

// INDECOPI requirements:
// - Title letters ≥ 1x1 cm = 28.35pt  → portrait 46pt / landscape 40pt
// - Legal text letters ≥ 0.5x0.5 cm = 14.17pt → 15pt in both
const LEGAL_SIZE = 20

const shared = StyleSheet.create({
	accentLine: {
		height: 4,
		backgroundColor: '#111827',
		width: '100%',
	},
	legalText: {
		fontSize: LEGAL_SIZE,
		textAlign: 'center',
		lineHeight: 1.7,
		color: '#1a1a1a',
	},
	scanLabel: {
		fontSize: 12,
		textAlign: 'center',
		color: '#444444',
	},
	qrUrl: {
		fontSize: 12,
		textAlign: 'center',
		color: '#555555',
	},
	footerText: {
		fontSize: 12,
		textAlign: 'center',
		color: '#777777',
		lineHeight: 1.5,
	},
})

const portraitStyles = StyleSheet.create({
	page: {
		paddingTop: 52,
		paddingBottom: 40,
		paddingHorizontal: 52,
		flexDirection: 'column',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		fontFamily: 'Helvetica',
	},
	title: {
		fontSize: 46,
		fontFamily: 'Helvetica-Bold',
		textAlign: 'center',
		letterSpacing: 1.5,
		lineHeight: 1.15,
		color: '#111827',
	},
	accentLine: {
		marginTop: 14,
		marginBottom: 28,
	},
	icon: {
		marginBottom: 35,
		marginTop: 28,
	},
	legalText: {
		maxWidth: 420,
		marginBottom: 32,
	},
	scanLabel: {
		marginBottom: 10,
	},
	qrImage: {
		width: 160,
		height: 160,
	},
	qrPlaceholder: {
		width: 140,
		height: 140,
		backgroundColor: '#EEEEEE',
	},
	qrUrl: {
		marginTop: 8,
	},
	spacer: {
		flexGrow: 1,
	},
	footer: {
		width: '100%',
		borderTopWidth: 1,
		borderTopColor: '#DDDDDD',
		paddingTop: 10,
		marginTop: 16,
	},
})

const landscapeStyles = StyleSheet.create({
	page: {
		paddingTop: 36,
		paddingBottom: 28,
		paddingHorizontal: 52,
		flexDirection: 'column',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		fontFamily: 'Helvetica',
	},
	title: {
		fontSize: 40,
		fontFamily: 'Helvetica-Bold',
		textAlign: 'center',
		letterSpacing: 1.5,
		lineHeight: 1.15,
		color: '#111827',
	},
	icon: {
		marginBottom: 22,
		marginTop: 14,
	},
	legalText: {
		marginBottom: 18,
	},
	scanLabel: {
		marginBottom: 8,
	},
	qrImage: {
		width: 140,
		height: 140,
	},
	qrPlaceholder: {
		width: 120,
		height: 120,
		backgroundColor: '#EEEEEE',
	},
	qrUrl: {
		marginTop: 6,
	},
	spacer: {
		flexGrow: 1,
	},
	footer: {
		width: '100%',
		borderTopWidth: 1,
		borderTopColor: '#DDDDDD',
		paddingTop: 8,
		marginTop: 12,
	},
})

function ClaimBookIcon({ width, height }: { width: number; height: number }) {
	return (
		<Svg viewBox='0 0 363 145' width={width} height={height}>
			<G>
				<Path
					fillRule='evenodd'
					d='m179.613 43.838 3.044 71.845c48.401-39.661 93.538-58.253 135.167-54.188L264.244 0c-33.725 1.729-62.108 15.939-84.631 43.838M24.354 84.631l62.104-59.059c30.126-6.49 59.983-1.583 89.502 17.657l.609 70.019C147.442 89.24 94.967 80.864 24.354 84.632Z'
					fill='#111827'
				/>
				<Path
					d='M196.661 112.639c39.147-30.108 80.645-42.735 121.163-42.62l12.786 11.568c-27.993-2.38-56.549.876-85.849 11.568 37.367-7.094 78.804-11.361 87.676 2.435-48.057-1.012-96.469-2.875-135.776 17.048M22.528 99.853v-6.697c58.07-5.885 108.069.305 146.126 24.354-48.629-19.034-97.347-23.394-146.126-17.657'
					fill='#111827'
				/>
				<Path
					d='M204.577 119.336c37.565-12.446 80.993-18.585 132.122-16.439v20.701c-36.794-6.626-81.882-7.295-132.122-4.262M22.528 105.333v19.483c48.474-2.674 96.396-3.76 143.691-3.044C121.678 104.168 73.75 98.8 22.528 105.333'
					fill='#111827'
				/>
				<Path
					fillRule='evenodd'
					d='M17.657 122.99v7.915l146.735-5.48c11.249 5.705 21.695 6.309 31.052 0l149.779 6.089V117.51l17.657 27.399-163.174-10.351c-10.399 7.858-22.64 8.972-37.14 1.827L.001 144.909z'
					fill='#111827'
				/>
			</G>
		</Svg>
	)
}

interface PageContentProps {
	qrDataUrl: string
	qrUrl: string
}

function PortraitPage({ qrDataUrl, qrUrl }: PageContentProps) {
	return (
		<Page size='A4' orientation='portrait' style={portraitStyles.page}>
			<Text style={portraitStyles.title}>
				LIBRO DE{'\n'}RECLAMACIONES
			</Text>

			{/* <View style={[shared.accentLine, portraitStyles.accentLine]} /> */}

			<View style={portraitStyles.icon}>
				<ClaimBookIcon width={240} height={96} />
			</View>

			<Text style={[shared.legalText, portraitStyles.legalText]}>
				Conforme a lo establecido en el Código de Protección y Defensa
				del Consumidor este establecimiento cuenta con un Libro de
				Reclamaciones a tu disposición. Solicítalo para registrar la
				queja o reclamo que tengas.
			</Text>

			<Text style={[shared.scanLabel, portraitStyles.scanLabel]}>
				Escanea aquí:
			</Text>

			{qrDataUrl ? (
				<Image src={qrDataUrl} style={portraitStyles.qrImage} />
			) : (
				<View style={portraitStyles.qrPlaceholder} />
			)}

			<Text style={[shared.qrUrl, portraitStyles.qrUrl]}>{qrUrl}</Text>

			<View style={portraitStyles.spacer} />

			<View style={portraitStyles.footer}>
				<Text style={shared.footerText}>
					En caso de negativa de entrega del libro escriba a:
					libroreclamaciones@indecopi.gob.pe
				</Text>
			</View>
		</Page>
	)
}

function LandscapePage({ qrDataUrl, qrUrl }: PageContentProps) {
	return (
		<Page size='A4' orientation='landscape' style={landscapeStyles.page}>
			<Text style={landscapeStyles.title}>LIBRO DE RECLAMACIONES</Text>

			<View style={landscapeStyles.icon}>
				<ClaimBookIcon width={240} height={96} />
			</View>

			<Text style={[shared.legalText, landscapeStyles.legalText]}>
				Conforme a lo establecido en el Código de Protección y Defensa
				del Consumidor este establecimiento cuenta con un Libro de
				Reclamaciones a tu disposición. Solicítalo para registrar la
				queja o reclamo que tengas.
			</Text>

			<Text style={[shared.scanLabel, landscapeStyles.scanLabel]}>
				Escanea aquí:
			</Text>

			{qrDataUrl ? (
				<Image src={qrDataUrl} style={landscapeStyles.qrImage} />
			) : (
				<View style={landscapeStyles.qrPlaceholder} />
			)}

			<Text style={[shared.qrUrl, landscapeStyles.qrUrl]}>{qrUrl}</Text>

			<View style={landscapeStyles.spacer} />

			<View style={landscapeStyles.footer}>
				<Text style={shared.footerText}>
					En caso de negativa de entrega del libro escriba a:
					libroreclamaciones@indecopi.gob.pe
				</Text>
			</View>
		</Page>
	)
}

interface NoticeDocumentProps {
	orientation: Orientation
	qrDataUrl: string
	qrUrl: string
}

export function NoticeDocument({
	orientation,
	qrDataUrl,
	qrUrl,
}: NoticeDocumentProps) {
	return (
		<Document>
			{orientation === 'portrait' ? (
				<PortraitPage qrDataUrl={qrDataUrl} qrUrl={qrUrl} />
			) : (
				<LandscapePage qrDataUrl={qrDataUrl} qrUrl={qrUrl} />
			)}
		</Document>
	)
}
