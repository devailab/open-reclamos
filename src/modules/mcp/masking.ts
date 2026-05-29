export function maskDocumentNumber(doc: string): string {
	if (doc.length <= 4) return doc
	return `${doc[0]}${'*'.repeat(doc.length - 4)}${doc.slice(-3)}`
}

function maskEmail(value: string): string {
	const atIndex = value.indexOf('@')
	if (atIndex <= 1) return '***'
	return `${value[0]}***${value.slice(atIndex)}`
}

export interface SensitiveComplaintFields {
	firstName: string
	lastName: string
	documentNumber: string
	email: string
	phone: string | null
	address: string | null
	guardianFirstName: string | null
	guardianLastName: string | null
	guardianDocumentNumber: string | null
}

export function maskComplaint<T extends SensitiveComplaintFields>(
	complaint: T,
	showSensitiveData: boolean,
): T {
	if (showSensitiveData) return complaint
	return {
		...complaint,
		firstName: '***',
		lastName: '***',
		documentNumber: maskDocumentNumber(complaint.documentNumber),
		email: maskEmail(complaint.email),
		phone: complaint.phone ? '***' : null,
		address: complaint.address ? '***' : null,
		guardianFirstName: complaint.guardianFirstName ? '***' : null,
		guardianLastName: complaint.guardianLastName ? '***' : null,
		guardianDocumentNumber: complaint.guardianDocumentNumber
			? maskDocumentNumber(complaint.guardianDocumentNumber)
			: null,
	}
}
