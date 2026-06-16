import { LoginForm } from "./login-form";

/**
 * Login page — renders the reviewer login form. The form posts the shared secret to `/api/auth`,
 * which sets the session cookie on success so the reviewer can reach the gated `/kb/*` and
 * `/private-skills/*` pages.
 */
export default function LoginPage() {
	return (
		<main className="min-h-screen grid place-items-center bg-background p-8">
			<LoginForm />
		</main>
	);
}
