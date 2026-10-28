import { createRoot } from 'react-dom/client'
import { App } from '@/app/app'
import '@fontsource/poppins/300.css'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Application container not found')

createRoot(root).render(<App />)
