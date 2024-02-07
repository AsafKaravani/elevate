import { QueryClientProvider } from '@tanstack/react-query';
import React, { ReactElement, FC } from 'react';
import { RecoilRoot } from 'recoil';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '../api/query-client';

interface AppStateProps extends React.PropsWithChildren {
	children: ReactElement | ReactElement[];
}

export const AppState: FC<AppStateProps> = React.memo(props => {
	return (
		<>
			<QueryClientProvider client={queryClient}>
				<RecoilRoot>{props.children}</RecoilRoot>
				{/* <ReactQueryDevtools initialIsOpen={false} /> */}
			</QueryClientProvider>
		</>
	);
});
