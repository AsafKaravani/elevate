import { ThemeProvider } from '@emotion/react';
import React, { ReactElement, FC } from 'react';
import { Toaster } from 'react-hot-toast';
import { muiTheme } from './mui-theme';
import { RtlSupport, useHtmlDir } from './RtlSupport';

interface AppThemeProps extends React.PropsWithChildren {
	children: ReactElement | ReactElement[];
}


export const AppTheme: FC<AppThemeProps> = props => {
	const dir = useHtmlDir();
	
	const theme = muiTheme(dir);
	return (
		<>
			<RtlSupport>
				<ThemeProvider theme={theme}>
					<Toaster
						toastOptions={{
							duration: 3000
						}}
					/>
					{props.children}
				</ThemeProvider>
			</RtlSupport>
		</>
	);
};

