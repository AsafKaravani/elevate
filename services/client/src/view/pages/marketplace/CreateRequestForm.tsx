import React from 'react';
import { FC } from 'react';
import { useForm } from 'react-hook-form';
import { AppForm } from '../../../core/form/AppForm';
import { useMutation_CreateOffer } from '../../../core/api/api';

type CreateRequestFormProps = {
	offerId?: number;
	productId?: number;
	onSuccess?: () => void;
};

export const CreateRequestForm: FC<CreateRequestFormProps> = React.memo(props => {
	const mutation_createOfferRequest = useMutation_CreateOffer();
	const form = useForm({
		defaultValues: {
			price_per_unit: undefined,
			quantity: undefined,
			payment_terms: undefined,
			packaging: undefined,
			delivery_due_date: undefined,
			destination_country: undefined,
			free_text: undefined
		}
	});
	const onSubmit = form.handleSubmit(data => {
		mutation_createOfferRequest.mutate(
			{
				parent_id: props.offerId,
				product_id: props.productId,
				...data
			},
			{
				onSuccess: () => {
					props.onSuccess?.();
					form.reset();
				}
			}
		);
	});

	return (
		<>
			<AppForm
				disabled={mutation_createOfferRequest.isPending}
				form={form}
				onSubmit={onSubmit}
				submitText={
					<>
						<i className="fa-solid fa-paper-plane me-2"></i>
						Send request
					</>
				}
				fields={[
					{
						name: 'price_per_unit',
						type: 'number',
						helperText: 'Price per kg'
					},
					{
						name: 'quantity',
						type: 'number',
						helperText: 'Quantity'
					},
					{
						name: 'payment_terms',
						type: 'text',
						helperText: 'Payment terms'
					},
					{
						name: 'packaging',
						type: 'number',
						helperText: 'Packaging'
					},
					{
						name: 'delivery_due_date',
						type: 'date',
						helperText: 'Delivery due date'
					},
					{
						name: 'destination_country',
						type: 'country',
						helperText: 'Destination country'
					},
					{
						name: 'free_text',
						type: 'text',
						helperText: 'Write a message to the supplier',
						grid: { row: 2, col: 1, rowSpan: 1, colSpan: 12 }
					}
				]}
			/>
		</>
	);
});
