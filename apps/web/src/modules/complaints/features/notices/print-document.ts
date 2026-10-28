// La ventana se abre desde el clic antes de esperar al RPC. El callback de
// carga necesita su propio manejo de errores porque ya está fuera del await.
export function printNoticeDocument(
	popup: Window,
	url: string,
	onError: (message: string) => void,
) {
	let disposed = false

	const report = () => {
		if (!disposed) {
			onError(
				'No se pudo iniciar la impresión automática. Abre el PDF manualmente y usa la opción Imprimir del visor.',
			)
		}
	}

	const loaded = () => {
		if (disposed) {
			return
		}

		clearTimeout(timer)

		try {
			if (popup.closed) {
				report()

				return
			}

			popup.focus()
			popup.print()
		} catch {
			report()
		}
	}

	const timer = setTimeout(report, 10000)

	popup.addEventListener('load', loaded, { once: true })

	try {
		popup.location.replace(url)
	} catch {
		clearTimeout(timer)
		report()
	}

	return () => {
		disposed = true
		clearTimeout(timer)
		popup.removeEventListener('load', loaded)
	}
}
