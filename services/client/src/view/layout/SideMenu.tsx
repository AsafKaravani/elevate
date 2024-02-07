import {
	Drawer,
	Toolbar,
	Divider,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	ListItemIcon,
	Avatar,
	Button
} from '@mui/material';
import React from 'react';
import { FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SideMenuItem } from './SideMenuItem';

const drawerWidth = '20vw';
const maxDrawerWidth = '220px';
const minDrawerWidth = '200px';

export const SideMenu: FC = React.memo(() => {
	const location = useLocation();

	if (location.pathname === '/s/onboarding') return null;

	return (
		<Drawer
			sx={{
				width: drawerWidth,
				maxWidth: maxDrawerWidth,
				minWidth: minDrawerWidth,
				flexShrink: 0,
				'& .MuiDrawer-paper': {
					width: drawerWidth,
					maxWidth: maxDrawerWidth,
					minWidth: minDrawerWidth,
					boxSizing: 'border-box'
				}
			}}
			variant="permanent"
			anchor="left"
		>
			<Toolbar className="h-12 min-h-0 bg-slate-300 flex justify-between p-2 ps-4">
				<h1 className="text-xl font-bold">Elevate</h1>
				<Button variant="text" className="text-slate-500 rounded-none min-w-0 h-full">
					<i className="fa-solid fa-bars"></i>
				</Button>
			</Toolbar>
			<List>

				{/* <SideMenuItem
					disabled
					to="/s/live-market"
					text="Live Market"
					icon="bullhorn"
					//notifications={4}
					//notificationsColor="red"
				/> */}
				{/* <SideMenuItem disabled text="Requests" to="/s/requests" icon="satellite-dish" />
				<SideMenuItem disabled text="Sales" to="/s/sales" icon="sack-dollar" />
				<SideMenuItem disabled text="Dispatches" to="/s/dispatches" icon="truck" notifications={2} />
				<SideMenuItem disabled text="Invoices" to="/s/invoices" icon="receipt" /> */}
			</List>
		</Drawer>
	);
});
