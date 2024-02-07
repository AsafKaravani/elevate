import { RouteObject } from 'react-router-dom';
import { Outlet, redirect } from 'react-router-dom';
import { HomePage } from '../../view/pages/HomePage';
import { Shell } from '../../view/layout/Shell';
import { checkAuthStatus } from '../firebase/firebase';
import { LiveMarketPage } from '../../view/pages/live-market/LiveMarketPage';
import { MarketplacePage } from '../../view/pages/marketplace/MarketplacePage';
import { OffersPage } from '../../view/pages/offers-page/OffersPage';
import { RequestsPage } from '../../view/pages/requests-page/RequestsPage';
import { GlobalJobs } from '../global-jobs/GlobalJobs';
import { OnboardingPage } from '../../view/pages/onboarding/OnboardingPage';
import { BuyersRequestsPage } from '../../view/pages/buyers-requests/BuyersRequestsPage';
import { RequestChatPage } from '../../view/pages/request-chat/RequestChatPage';

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
		{ path: 'live-market', element: <LiveMarketPage /> },
		{ path: 'marketplace', element: <MarketplacePage /> },
		{ path: 'offers', element: <OffersPage /> },
		{ path: 'requests', element: <RequestsPage /> },
		{ path: 'buyers-requests', element: <BuyersRequestsPage /> },
		{ path: 'requests/chat/:requestId', element: <RequestChatPage /> },
		{ path: 'onboarding', element: <OnboardingPage /> }
	]
};
