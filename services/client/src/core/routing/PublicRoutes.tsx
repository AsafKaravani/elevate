import { RouteObject, Outlet, Navigate } from 'react-router-dom';
import { LoginPage } from '../../view/pages/LoginPage';
import { RegisterPage } from '../../view/pages/RegisterPage';

export const PublicRoutes: RouteObject = {
	path: '/',
	element: (
		<>
			<Outlet />
		</>
	),
	children: [
		{ path: '/', element: <Navigate to="/s/home" replace /> },
		{ path: '/s/', element: <Navigate to="/s/home" replace /> },
		{ path: 'login', element: <LoginPage /> },
		{ path: 'register', element: <RegisterPage /> }
	]
};
