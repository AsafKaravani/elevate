import { Button } from '@mui/material';
import React from 'react';
import { FC } from 'react';
import { LanguagePicker } from '../../core/translations/LanguagePicker';
import { ProfileButton } from './ProfileButton';
import { useRecoilState } from 'recoil';
import { atom_layoutState } from './layout-state';

export const TopBar: FC = React.memo(() => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);
	
	return (
		<div className="h-12 bg-primary-color flex justify-between items-center py-0 px-2">
			<span className=" flex items-center h-full gap-2">
				<Button onClick={() => setLayoutState({isMenuOpen: true})} variant="text" className="text-white  opacity-75 rounded-none min-w-0 h-full" >
					<i className="fa-solid fa-bars"></i>
				</Button>
				{/* <LanguagePicker /> */}
			</span>
			<ProfileButton />
		</div>
	);
});
