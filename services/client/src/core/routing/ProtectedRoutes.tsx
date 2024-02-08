import { RouteObject } from 'react-router-dom';
import { Outlet, redirect } from 'react-router-dom';
import { HomePage } from '../../view/pages/HomePage';
import { Shell } from '../../view/layout/Shell';
import { checkAuthStatus } from '../firebase/firebase';
import { GlobalJobs } from '../global-jobs/GlobalJobs';
import { OnboardingPage } from '../../view/pages/onboarding/OnboardingPage';

const authGuard = async () => {
	const isAuthenticated = await checkAuth();
	if (!isAuthenticated) {
		throw redirect('/login');
	}

	return true;
};

const checkAuth = async () => {
	let user;
	try {
		user = await checkAuthStatus();
	} catch (error) {
		console.error(error);
		return false;
	}

	if (!user) return false;

	return true;
};

export const ProtectedRoutes: RouteObject = {
	path: '/s',
	element: (
		<>
			<GlobalJobs />
			<Shell>
				<Outlet />
			</Shell>
		</>
	),
	loader: authGuard,
	children: [
		{ path: 'home', element: <HomePage /> },
		{ path: 'onboarding', element: <OnboardingPage /> },
		{ path: 'elevators', element: <>elevators</> },
		{ path: 'add-device', element: <>add-device</> },
	]
};
