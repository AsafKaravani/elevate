import { Button } from '@mui/material';
import React from 'react';
import { FC } from 'react';
import { LanguagePicker } from '../../core/translations/LanguagePicker';
import { ProfileButton } from './ProfileButton';

export const TopBar: FC = React.memo(() => {
	return (
		<div className="h-12 bg-slate-200 flex justify-between items-center py-0 px-2">
			<span className=" flex items-center h-full gap-2">
				<Button variant="text" className="text-slate-500 rounded-none min-w-0 h-full">
					<i className="fa-solid fa-bell"></i>
				</Button>
				<LanguagePicker />
			</span>
			<span className="text-slate-500 font-bold">Elevate</span>
			<ProfileButton />
		</div>
	);
});
