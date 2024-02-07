import { Autocomplete, TextField } from '@mui/material';
import React, { FC, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AppFieldProps } from './Field.type';
import { useQuery_AllProducts } from '../../api/api';

type RegisterProps = ReturnType<ReturnType<typeof useForm>['register']>;
type ProductFieldProps = RegisterProps & AppFieldProps;

export const ProductField: FC<ProductFieldProps> = React.memo(props => {
	const query_Products = useQuery_AllProducts();
	const options = query_Products.data?.Product.map(product => ({ label: product.name, value: product.id })) || [];

	const [value, setValue] = React.useState<{ label: string; value: number } | null>(null);
	const [inputValue, setInputValue] = React.useState<number | undefined>();
	const register = props.register ? props.register : () => {};

	useEffect(() => {
		setValue(options.find(option => option.value === props.value) || null);
	}, [props.value, options]);

	return (
		<div className="relative">
			<input className="hidden" {...register(props.name)} />
			<Autocomplete
				value={value}
				onChange={(event: any, newValue) => {
					console.log(newValue);
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-expect-error
					props.setValue(newValue?.value);
					setValue(newValue);
				}}
				options={options}
				renderInput={params => <TextField {...params} />}
			/>
		</div>
	);
});
