import { Button } from '@mui/material';
import React from 'react';
import { FC } from 'react';
import { LanguagePicker } from '../../core/translations/LanguagePicker';
import { ProfileButton } from './ProfileButton';

export const TopBar: FC = React.memo(() => {
	return (
		<div className="h-12 bg-primary-color flex justify-between items-center py-0 px-2">
			<span className=" flex items-center h-full gap-2">
				{/* <Button variant="text" className="text-white  opacity-75 rounded-none min-w-0 h-full">
					<i className="fa-solid fa-bell"></i>
				</Button> */}
				<LanguagePicker />
			</span>
			<ProfileButton />
		</div>
	);
});
