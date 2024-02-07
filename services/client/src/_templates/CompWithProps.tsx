import React, { FC } from 'react';

interface CompProps extends React.PropsWithChildren {}

export const Comp: FC<CompProps> = React.memo(props => {
	return (
		<>
			<h1>Comp Works.</h1>
		</>
	);
});
