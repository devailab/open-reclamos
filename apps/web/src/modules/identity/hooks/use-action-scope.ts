import { useEffect, useState } from 'react'
import { createActionScope } from '../action-scope'

export function useActionScope() {
	const [scope] = useState(createActionScope)

	useEffect(() => () => scope.cancel(), [scope])

	return scope
}
