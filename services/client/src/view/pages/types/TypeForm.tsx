import { Button } from '@mui/material';
import React, { FC } from 'react';
import { useMutation_CreateDeviceType } from '../../../core/api/api';
import { useForm } from 'react-hook-form';
import { AppForm } from '../../../core/form/AppForm';

interface TypeFormProps extends React.PropsWithChildren {}

export const TypeForm: FC<TypeFormProps> = React.memo(props => {
	const mutation_createType = useMutation_CreateDeviceType()
	const form = useForm();
	const onSubmit = form.handleSubmit((data) => {
		
		mutation_createType.mutate({...data, status_fields: {x: '2'}})
	});
	return (
		<>
			<AppForm 
				form={form} 
				onSubmit={onSubmit}
				submitText='שמור'
				fields={[{
					name: 'name',
					helperText: 'שם הסוג',
					type: 'text',
				}, {
					name: 'status_fields',
					type: 'status_fields',
				}]}/>
		</>
	);
});
