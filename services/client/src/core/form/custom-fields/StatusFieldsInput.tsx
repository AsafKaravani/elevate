import React, { FC, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AppFieldProps } from './Field.type';
import { Button, TextField } from '@mui/material';

type RegisterProps = ReturnType<ReturnType<typeof useForm>['register']>;
type FieldProps = RegisterProps & AppFieldProps;

export const StatusFieldsInput: FC<FieldProps> = React.memo(props => {


	const [newStatusKey, setNewStatusKey] = React.useState<string>('');
	const addNewStatus = () => {
		if (newStatusKey) {
			props.setValue!({...props.value, [newStatusKey]: { label: '', correctState: '', helperText: '' }});
			setNewStatusKey('');
		}
	}


	const deleteKey = (key: string) => {
		const newValues = { ...props.value };
		delete newValues[key];
		props.setValue!(newValues);
	}

	const registerStatusKeyField = (key: string, field: 'label' | 'correctState' | 'helperText') => {
		return {
			onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.setValue!({...props.value, [key]: { ...props.value[key], [field]: e.target.value }}),
			value: props.value[key][field],
		}
	}

	return (
		<div className="relative ">
			<input className="hidden" {...props.register!(props.name)} />
			{props.value && Object.keys(props.value).length > 0 && Object.keys(props.value).map((key, index) => (
				<div className='w-full mb-4 flex-wrap flex gap-[3%]'>
					<div className='flex gap-2 mb-4 w-full'>
						<TextField className='w-full' disabled value={key}/>
						<Button onClick={() => deleteKey(key)} color='error' variant='text' className='min-w-0' >
							<i className="fas fa-trash"></i>
						</Button>
					</div>
					<TextField helperText="שם סנסור" className='w-[31.333%] mb-4' {...registerStatusKeyField(key, 'label')}/>
					<TextField helperText="מצב תקין" className='w-[31.333%] mb-4' {...registerStatusKeyField(key, 'correctState')}/>
					<TextField helperText="טקסט עזר" className='w-[31.333%] mb-4' {...registerStatusKeyField(key, 'helperText')}/>
				</div>
			))}
			<div className='flex gap-4'>
				<TextField helperText='' className='flex-1' value={newStatusKey} onChange={e => setNewStatusKey(e.target.value)} />
				<Button variant='outlined' onClick={addNewStatus}>
					<i className="fas fa-plus me-2"></i>
				הוסף שדה
				</Button>
			</div>
		</div>
	);
});
