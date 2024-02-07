import { ListItem, ListItemButton, ListItemText, Avatar } from '@mui/material';
import React, { FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslate } from '../../core/translations/useTranslate';

interface SideMenuItemProps extends React.PropsWithChildren {
	to?: string;
	text: string;
	icon: string;
	notifications?: number;
	notificationsColor?: string;
	disabled?: boolean;
}

export const SideMenuItem: FC<SideMenuItemProps> = React.memo(props => {
	const navigate = useNavigate();
	const location = useLocation();
	const isActive = location.pathname === props.to;

	let goto = () => {};
	if (typeof props.to === 'string') {
		goto = () => navigate(props.to as string);
	}

	return (
		<ListItem className={`${isActive ? 'bg-slate-300' : ''}`}>
			<ListItemButton disabled={props.disabled} onClick={goto}>
				<i className={`fa-solid fa-${props.icon} w-5 me-4`}></i>
				<ListItemText primary={props.text} />
				{props.notifications !== undefined && props.notifications > 0 && (
					<Avatar className={`w-6 h-6 text-xs bg-black bg-opacity-10 text-black bg-${props.notificationsColor}-600`}>
						{props.notifications}
					</Avatar>
				)}
			</ListItemButton>
		</ListItem>
	);
});
