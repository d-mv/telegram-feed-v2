import { useState } from 'react'
import './App.css'
import { createAuthFromEnv } from './domains/auth/infra/authFactory'
import type { AuthClient } from './domains/auth/model/authTypes'
import { LoginView } from './domains/auth/ui/LoginView'
import { FeedView } from './domains/feed/ui/FeedView'

type AppProps = {
	auth?: AuthClient
}

function App({ auth }: AppProps) {
	const [isAuthenticated, setIsAuthenticated] = useState(false)
	const authClient = auth ?? createAuthFromEnv()

	if (isAuthenticated) {
		return <FeedView />
	}

	return (
		<LoginView
			auth={authClient}
			onAuthenticated={() => setIsAuthenticated(true)}
		/>
	)
}

export default App
