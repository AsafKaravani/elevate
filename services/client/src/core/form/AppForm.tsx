import React, { FC } from 'react';
import { FieldMap } from './custom-fields/field-map';
import { useForm } from 'react-hook-form';
import { Button, FormHelperText } from '@mui/material';
import { AppFieldProps } from './custom-fields/Field.type';

interface AppFormProps extends React.PropsWithChildren {
	form: ReturnType<typeof useForm<any>>;
	disabled?: boolean;
	fields: Array<AppFieldProps>;
	submitText?: string | React.ReactNode;
	onSubmit?: ReturnType<ReturnType<typeof useForm<any>>['handleSubmit']>;
	noSubmit?: boolean;
}

const rowColToCssGrid = (grid?: { row?: number; col?: number; rowSpan?: number; colSpan?: number }) => {
	if (!grid) {
		grid = {};
	}
	let className = '';
	if (grid.row) {
		className = className.concat(`row-start-${grid.row} `);
	}
	if (grid.col) {
		className = className.concat(`col-start-${grid.col} `);
	}
	if (grid.rowSpan) {
		className = className.concat(`row-span-${grid.rowSpan} `);
	}
	if (grid.colSpan) {
		className = className.concat(`col-span-${grid.colSpan} `);
	} else {
		className = className.concat(`lg:col-span-2 col-span-12`);
	}
	return className;
};

export const AppForm: FC<AppFormProps> = React.memo(props => {
	const form = props.form;
	const onSubmit = props.onSubmit ? props.onSubmit : ((() => {}) as any);
	const values = form.watch();

	// find max row number
	const maxRow = props.fields.reduce((acc, curr) => {
		if (curr.grid?.row || 1 > acc) {
			return curr.grid?.row || 1;
		}
		return acc;
	}, 0);

	return (
		<div>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<div className={`grid grid-cols-12 grid-rows-${maxRow} gap-4`}>
					{props.fields?.map(field => {
						const Field = FieldMap[field.type] as any;
						const disabledClass = props.disabled ? 'opacity-50 pointer-events-none' : '';
						return (
							<div key={field.name} className={`flex flex-col ${rowColToCssGrid(field.grid)} ${disabledClass}`}>
								<Field
									{...field}
									helperText={undefined}
									register={form.register}
									value={values[field.name]}
									setValue={value => form.setValue(field.name as any, value)}
								/>
								{field.helperText && <FormHelperText className="ms-3">{field.helperText}</FormHelperText>}
							</div>
						);
					})}
				</div>
				{!props.noSubmit && (
					<Button type="submit" className="mt-4 px-10" size="small">
						{props.submitText || 'Submit'}
					</Button>
				)}
			</form>
		</div>
	);
});
