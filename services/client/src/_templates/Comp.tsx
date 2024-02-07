import React from 'react';
import { FC } from 'react';

export const Comp: FC = React.memo(() => {
	return (
		<>
			<h1>Comp Works.</h1>
		</>
	);
});
