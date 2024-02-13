import React from 'react';
import { FC } from 'react';
import { TypeForm } from './TypeForm';

export const TypesPage: FC = React.memo(() => {
	return (
		<div className='p-4'>
			<TypeForm />
		</div>
	);
});
