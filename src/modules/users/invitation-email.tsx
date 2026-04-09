import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Preview,
	Section,
	Text,
} from '@react-email/components'

interface InvitationEmailProps {
	organizationName: string
	inviteUrl: string
}

export function InvitationEmail({
	organizationName,
	inviteUrl,
}: InvitationEmailProps) {
	return (
		<Html lang='es'>
			<Head />
			<Preview>
				Has sido invitado a unirte a {organizationName} en Open Reclamos
			</Preview>
			<Body style={styles.body}>
				<Container style={styles.container}>
					{/* Header */}
					<Section style={styles.header}>
						<Text style={styles.logo}>Open Reclamos</Text>
					</Section>

					{/* Content */}
					<Section style={styles.content}>
						<Heading style={styles.heading}>
							Tienes una invitación
						</Heading>
						<Text style={styles.paragraph}>
							Has sido invitado a unirte al equipo de{' '}
							<strong>{organizationName}</strong> en Open
							Reclamos, la plataforma de gestión del Libro de
							Reclamaciones Virtual.
						</Text>
						<Text style={styles.paragraph}>
							Haz clic en el botón de abajo para crear tu cuenta y
							comenzar a gestionar reclamos. El enlace es válido
							por <strong>7 días</strong>.
						</Text>

						<Section style={styles.buttonContainer}>
							<Button href={inviteUrl} style={styles.button}>
								Aceptar invitación
							</Button>
						</Section>

						<Hr style={styles.divider} />

						<Text style={styles.linkNote}>
							Si el botón no funciona, copia y pega este enlace en
							tu navegador:
						</Text>
						<Text style={styles.linkText}>{inviteUrl}</Text>
					</Section>

					{/* Footer */}
					<Section style={styles.footer}>
						<Text style={styles.footerText}>
							Si no esperabas esta invitación, puedes ignorar este
							correo con total seguridad.
						</Text>
						<Text style={styles.footerText}>
							© {new Date().getFullYear()} Open Reclamos
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	)
}

const styles = {
	body: {
		backgroundColor: '#f4f4f5',
		fontFamily:
			'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		margin: 0,
		padding: '32px 0',
	},
	container: {
		backgroundColor: '#ffffff',
		borderRadius: '12px',
		margin: '0 auto',
		maxWidth: '560px',
		overflow: 'hidden',
	},
	header: {
		backgroundColor: '#18181b',
		padding: '20px 32px',
	},
	logo: {
		color: '#ffffff',
		fontSize: '16px',
		fontWeight: '700',
		margin: 0,
	},
	content: {
		padding: '32px',
	},
	heading: {
		color: '#09090b',
		fontSize: '22px',
		fontWeight: '700',
		lineHeight: '1.3',
		margin: '0 0 16px',
	},
	paragraph: {
		color: '#3f3f46',
		fontSize: '15px',
		lineHeight: '1.6',
		margin: '0 0 16px',
	},
	buttonContainer: {
		margin: '28px 0',
		textAlign: 'center' as const,
	},
	button: {
		backgroundColor: '#18181b',
		borderRadius: '8px',
		color: '#ffffff',
		display: 'inline-block',
		fontSize: '15px',
		fontWeight: '600',
		padding: '12px 28px',
		textDecoration: 'none',
	},
	divider: {
		borderColor: '#e4e4e7',
		margin: '24px 0',
	},
	linkNote: {
		color: '#71717a',
		fontSize: '13px',
		margin: '0 0 8px',
	},
	linkText: {
		color: '#3f3f46',
		fontSize: '13px',
		margin: 0,
		wordBreak: 'break-all' as const,
	},
	footer: {
		backgroundColor: '#fafafa',
		borderTop: '1px solid #e4e4e7',
		padding: '20px 32px',
	},
	footerText: {
		color: '#a1a1aa',
		fontSize: '12px',
		lineHeight: '1.5',
		margin: '0 0 4px',
	},
}
