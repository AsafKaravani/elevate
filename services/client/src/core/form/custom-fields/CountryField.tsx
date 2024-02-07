import { Autocomplete, FormHelperText, MenuItem, Select, TextField } from '@mui/material';
import React, { FC, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AppFieldProps } from './Field.type';
import countries from '../../../assets/countries.json';

type RegisterProps = ReturnType<ReturnType<typeof useForm>['register']>;
type CountryFieldProps = RegisterProps & AppFieldProps;

export const CountryField: FC<CountryFieldProps> = React.memo(props => {

	const [value, setValue] = React.useState<{ label: string; value: number } | null>(null);
	const [inputValue, setInputValue] = React.useState<number | undefined>();
	const register = props.register ? props.register : () => {};

	useEffect(() => {
		setValue(props.value);
	}, [props.value]);

	return (
		<div className="relative ">
			<input className="hidden" {...register(props.name)} />
			<div className="h-[43px]">
				<Select
					className="w-full h-[43px] bg-[#0000000f]"
					value={value}
					onChange={e => props.setValue!(e.target.value as any)}
				>
					<MenuItem value={''}>Pick Country</MenuItem>
					{countries.map(country => (
						<MenuItem value={country.name}>
							<div className="flex items-center">
								<img src={`https://flagsapi.com/${country.code}/flat/32.png`} className="h-4 me-2" />
								{country.name}
							</div>
						</MenuItem>
					))}
				</Select>
			</div>
		</div>
	);
});
