import { ThemeProvider } from '@emotion/react';
import React, { ReactElement, FC } from 'react';
import { Toaster } from 'react-hot-toast';
import { muiTheme } from './mui-theme';
import { RtlSupport } from './RtlSupport';

interface AppThemeProps extends React.PropsWithChildren {
	children: ReactElement | ReactElement[];
}


export const AppTheme: FC<AppThemeProps> = props => {
	return (
		<>
			<RtlSupport>
				<ThemeProvider theme={muiTheme}>
					<Toaster
						toastOptions={{
							duration: 5000
						}}
					/>
					{props.children}
				</ThemeProvider>
			</RtlSupport>
		</>
	);
};

