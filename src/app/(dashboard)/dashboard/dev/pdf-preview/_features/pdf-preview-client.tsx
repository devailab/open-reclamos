'use client'

import { PDFViewer } from '@react-pdf/renderer'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ComplaintReceiptPdfInput } from '@/modules/complaints/components/complaint-receipt-pdf-document'
import { ComplaintReceiptPdfDocument } from '@/modules/complaints/components/complaint-receipt-pdf-document'

const BASE: ComplaintReceiptPdfInput = {
	accentColor: null,
	document: {
		title: 'Constancia de recepción',
		subject: 'Constancia de recepción de reclamo',
		footerNote:
			'Constancia generada automáticamente por Open Reclamos. La presentación del reclamo o queja no limita el acceso a otras vías de solución de controversias ni constituye un requisito previo para acudir al INDECOPI.',
	},
	organization: {
		name: 'Devailab S.A.C.',
		legalName: 'Devailab Sociedad Anónima Cerrada',
		taxId: '20613951289',
		address: 'Av. Javier Prado Este 1234',
		location: 'San Isidro, Lima',
		contact: '+51 1 234-5678 • www.devailab.com',
		website: 'www.devailab.com',
	},
	store: {
		name: 'Tienda San Isidro',
		detail: 'Av. Javier Prado Este 1234, San Isidro • Lima, Lima',
		modeLabel: 'Tienda física',
	},
	consumer: {
		heading: 'Juan Carlos Pérez García',
		identity: 'DNI 12345678',
		representative: null,
		contact: 'juan.perez@correo.com • +51 987 654 321',
		address: 'Calle Las Flores 456 • Miraflores, Lima',
	},
	complaint: {
		createdAt: '23 ene 2025, 10:30',
		responseDeadline: '07 de febrero de 2025',
		typeLabel: 'Reclamo',
		typeDescription:
			'Disconformidad relacionada con los productos o servicios.',
		reason: 'Calidad del producto',
		correlative: '2025-00042',
		trackingCode: 'TRK-A3F9B2',
		incidentDate: '20 ene 2025',
		itemSummary: 'Bien • Televisor Samsung 55" QLED',
		amount: 'S/ 2,499.00',
		proofOfPayment: 'Boleta de venta • 001-00012345',
	},
	narratives: {
		detail: 'Adquirí el televisor el día 15 de enero de 2025 y al momento de instalarlo noté que la pantalla presentaba una franja horizontal de píxeles muertos en la parte central. El producto fue entregado en caja sellada pero al abrirla el defecto ya estaba presente. Me comuniqué con el servicio de atención al cliente en dos oportunidades sin recibir una respuesta satisfactoria.',
		request:
			'Solicito el cambio inmediato del producto por uno en perfecto estado, o en su defecto la devolución completa del monto pagado más los gastos de envío incurridos.',
		attachments: 'Se adjuntaron 3 archivo(s).',
	},
	providerSection: {
		title: 'Observaciones y acciones adoptadas por el proveedor',
		content:
			'Constancia generada automáticamente al momento del registro. La empresa aún no registra observaciones ni acciones adoptadas sobre este caso. La respuesta debe ser comunicada hasta el 07 de febrero de 2025.',
		tone: 'default',
	},
}

const MOCK_RECEIPT: ComplaintReceiptPdfInput = BASE

const MOCK_RESPONSE: ComplaintReceiptPdfInput = {
	...BASE,
	document: {
		title: 'Respuesta al reclamo 2025-00042',
		subject: 'Respuesta de Devailab S.A.C. a tu reclamo 2025-00042',
		footerNote:
			'Respuesta generada automáticamente por Open Reclamos como parte del seguimiento del reclamo o queja registrado.',
	},
	providerSection: {
		title: 'Observaciones y acciones adoptadas por el proveedor',
		content: [
			'Respuesta emitida el 25 ene 2025, 14:15.',
			'',
			'Estimado cliente, luego de revisar su caso, confirmamos que el televisor presentó un defecto de fabricación. Hemos procedido a coordinar el recojo del producto defectuoso en su domicilio para el día 27 de enero de 2025. El cambio por una unidad nueva se realizará dentro de los siguientes 3 días hábiles después del recojo. Le pedimos disculpas por los inconvenientes ocasionados.',
		].join('\n'),
		tone: 'response',
	},
}

type Mode = 'receipt' | 'response'

export function PdfPreviewClient() {
	const [mode, setMode] = useState<Mode>('receipt')
	const data = mode === 'receipt' ? MOCK_RECEIPT : MOCK_RESPONSE

	return (
		<div className='flex flex-1 min-h-0 flex-col gap-3'>
			<div className='flex items-center gap-2'>
				<span className='text-sm text-muted-foreground'>
					Vista previa —
				</span>
				<Button
					size='sm'
					variant={mode === 'receipt' ? 'default' : 'outline'}
					onClick={() => setMode('receipt')}
				>
					Constancia de recepción
				</Button>
				<Button
					size='sm'
					variant={mode === 'response' ? 'default' : 'outline'}
					onClick={() => setMode('response')}
				>
					Respuesta al reclamo
				</Button>
			</div>

			<div className='flex-1 min-h-0 overflow-hidden rounded-lg border bg-muted'>
				<PDFViewer
					width='100%'
					height='100%'
					style={{ border: 'none' }}
				>
					<ComplaintReceiptPdfDocument data={data} />
				</PDFViewer>
			</div>
		</div>
	)
}
