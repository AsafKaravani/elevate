import { FC } from 'react';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import { ProtectedRoutes } from './ProtectedRoutes';
import { PublicRoutes } from './PublicRoutes';

const Root = () => {
	return (
		<>
			<Outlet />
		</>
	);
};

export const AppRouter: FC = () => {
	const router = createBrowserRouter([{
		path: '/',
		element: <Root />,
		children: [ProtectedRoutes, PublicRoutes]
	}]);

	return (
		<>
			<RouterProvider router={router} />
		</>
	);
};
