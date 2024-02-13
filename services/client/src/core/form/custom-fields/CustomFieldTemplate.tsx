import React, { FC, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AppFieldProps } from './Field.type';

type RegisterProps = ReturnType<ReturnType<typeof useForm>['register']>;
type FieldProps = RegisterProps & AppFieldProps;

export const CustomField: FC<FieldProps> = React.memo(props => {

	const [value, setValue] = React.useState<{ label: string; value: number } | null>(null);

	useEffect(() => {
		setValue(props.value);
	}, [props.value]);

	return (
		<div className="relative ">
			<input className="hidden" {...props.register!(props.name)} />
			<div className="h-[43px]">
				{/* Put here your custom field */}
			</div>
		</div>
	);
});
