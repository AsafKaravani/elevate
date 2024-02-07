import { FieldValues, RegisterOptions } from 'react-hook-form';
import { FieldMap } from './field-map';

export type AppFieldProps = {
	name: string;
	register?: (name) => any;
	value?: any;
	setValue?: (value) => any;
	grid?: {
		row?: number;
		col?: number;
		rowSpan?: number;
		colSpan?: number;
	};
	type: keyof typeof FieldMap;
	label?: string;
	helperText?: string;
	placeholder?: string;
	options?: RegisterOptions<FieldValues, any> | undefined;
	autoComplete?: string;
};
