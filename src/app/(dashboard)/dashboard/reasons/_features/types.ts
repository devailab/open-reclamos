export interface ReasonRow {
	id: string
	reason: string
	parentId: string | null
	organizationId: string | null
	createdAt: Date
	updatedAt: Date | null
}

export interface ReasonNode extends ReasonRow {
	children: ReasonNode[]
}

export function buildReasonTree(rows: ReasonRow[]): ReasonNode[] {
	const map = new Map<string, ReasonNode>()
	const roots: ReasonNode[] = []

	for (const row of rows) {
		map.set(row.id, { ...row, children: [] })
	}

	for (const node of map.values()) {
		if (node.parentId && map.has(node.parentId)) {
			// biome-ignore lint/style/noNonNullAssertion: verificado con has() arriba
			map.get(node.parentId)!.children.push(node)
		} else {
			roots.push(node)
		}
	}

	return roots
}
