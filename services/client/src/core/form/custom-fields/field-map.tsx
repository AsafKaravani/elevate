import { Checkbox, TextField } from '@mui/material';
import { CountryField } from './CountryField';
import { StatusFieldsInput } from './StatusFieldsInput';

export const FieldMap = {
	text: ({ name, register, setValue, ...props }: any) => <TextField autoComplete="off" {...props} className='rounded overflow-hidden' {...register(name)} />,
	number: ({ name, register, setValue, ...props }: any) => <TextField {...props} {...register(name)} type="number" />,
	boolean: ({ name, register, setValue, ...props }: any) => <Checkbox {...props} {...register(name)} />,
	date: ({ name, register, setValue, ...props }: any) => <TextField {...props} {...register(name)} />,
	country: (props: any) => <CountryField {...props} />,
	status_fields: (props: any) => <StatusFieldsInput {...props} />
} as const;
