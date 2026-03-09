import type { NextPage } from 'next'
import { redirect } from 'next/navigation'

const HomePage: NextPage = () => {
	return redirect('/login')
}

export default HomePage
