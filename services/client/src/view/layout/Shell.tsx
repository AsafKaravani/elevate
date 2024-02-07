import React, { ReactElement, FC } from 'react';
import { SideMenu } from './SideMenu';
import { TopBar } from './TopBar';

interface CompProps extends React.PropsWithChildren {
	children: ReactElement | ReactElement[];
}

export const Shell: FC<CompProps> = props => {
	return (
		<div className="flex h-screen">
			<SideMenu />
			<div className="flex flex-col flex-1">
				<TopBar />
				<div className="flex-1 overflow-y-auto">{props.children}</div>
			</div>
		</div>
	);
};
