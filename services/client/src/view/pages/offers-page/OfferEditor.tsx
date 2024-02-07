import React, { FC, useEffect, useState } from 'react';
import { Offer, useMutation_CreateOffer, useMutation_UpdateOffer } from '../../../core/api/api';
import { Button, Checkbox, FormControl, FormHelperText, MenuItem, Select, TextField, Tooltip } from '@mui/material';
import { SubmitHandler, useForm } from 'react-hook-form';
import countries from '../../../assets/countries.json';

interface OfferEditorProps extends React.PropsWithChildren {
	offer?: Offer;
	onSave?: (offer: Offer) => void;
}

type OfferFormFields = {
	id: number;
	product_id?: number;
	end_date?: Date;
	price_per_unit?: number;
	packaging?: number;
	quantity?: number;
	origin_country?: string;
	appearance?: string;
	texture?: string;
	payment_terms?: string;
	active?: boolean;
	harvest_date?: Date;
	created_at: Date;
	updated_at?: Date;
};

export const OfferEditor: FC<OfferEditorProps> = React.memo(props => {
	const [mode, setMode] = useState<'new' | 'edit' | 'none'>('none');
	const mutation_CreateOffer = useMutation_CreateOffer();
	const mutation_UpdateOffer = useMutation_UpdateOffer();

	useEffect(() => {
		if (props.offer) {
			offerForm.reset(props.offer);
			setMode('edit');
		} else {
			setMode('none');
		}
	}, [props.offer]);

	useEffect(() => {
		if (mutation_CreateOffer.isSuccess) {
			offerForm.reset({ id: mutation_CreateOffer.data?.insert_Offer_one?.id });
		}
	}, [mutation_CreateOffer.isSuccess]);

	const offerForm = useForm<OfferFormFields>({});
	const offer = offerForm.watch();

	useEffect(() => {
		if (props.offer && offer.id) {
			setMode('edit');
		}
	}, [offer]);

	const onSubmit: SubmitHandler<OfferFormFields> = offer => {
		// reamove empty fields

		Object.keys(offer).forEach(key => {
			if (offer[key] === '') {
				delete offer[key];
			}
		});

		if (mode === 'new') {
			mutation_CreateOffer.mutate(offer);
		} else if (mode === 'edit') {
			mutation_UpdateOffer.mutate(offer);
		}
	};

	const createNewOffer = () => {
		setMode('new');
		const offerNullMap = Object.keys(offer).reduce((acc, key) => {
			acc[key] = null;
			return acc;
		}, {} as OfferFormFields);
		offerForm.reset(offerNullMap);
	};

	return (
		<div className="w-full h-full">
			{mode === 'none' ? (
				<NoOfferMessage onClickNewOffer={createNewOffer} />
			) : (
				<div className="p-4" onSubmit={offerForm.handleSubmit(onSubmit)}>
					<form>
						<div className="flex flex-col gap-2">
							<div className="flex flex-wrap gap-2 items-center">
								<TextField
									className="flex-3"
									{...offerForm.register('product_id')}
									helperText="Product ID"
									type="number"
								/>
								<TextField
									className="flex-3"
									{...offerForm.register('end_date')}
									helperText="Offer expiration date"
									type="date"
								/>
								<TextField
									className="flex-1"
									{...offerForm.register('price_per_unit')}
									helperText="Price per Unit"
									type="number"
								/>
								<TextField
									className="flex-1"
									{...offerForm.register('packaging')}
									helperText="Packaging"
									type="number"
								/>
								<Tooltip title="If 'checked' this offer will be visible at the marketplace">
									<div className="flex-1 flex justify-center">
										<div>
											<Checkbox className="flex-3" {...offerForm.register('active')} />
											<FormHelperText>Active</FormHelperText>
										</div>
									</div>
								</Tooltip>
								<TextField {...offerForm.register('harvest_date')} helperText="Harvest Date" type="date" />
							</div>
							<div className="flex gap-2 relative">
								<TextField className="flex-1" {...offerForm.register('payment_terms')} helperText="Payment Terms" />
								<TextField className="" {...offerForm.register('quantity')} helperText="Quantity" type="number" />
								<div className="h-[43px]">
									<Select className="w-full h-[43px]" defaultValue={''}>
										<MenuItem value={''}>Pick Coutnry</MenuItem>
										{countries.map(country => (
											<MenuItem value={country.name}>
												<div className="flex items-center">
													<img src={`https://flagsapi.com/${country.code}/flat/32.png`} className="h-4 me-2" />
													{country.name}
												</div>
											</MenuItem>
										))}
									</Select>
									<FormHelperText>Origin country</FormHelperText>
								</div>
							</div>

							<div className="flex flex-wrap gap-2">
								<TextField className="flex-1" {...offerForm.register('appearance')} helperText="Appearance" />
								<TextField className="flex-1" {...offerForm.register('texture')} helperText="Texture" />
							</div>
						</div>
						<div className="flex justify-between mt-4">
							<Button
								size="small"
								className="px-14"
								variant="contained"
								color="primary"
								type="submit"
								disabled={mutation_CreateOffer.isPending || mutation_UpdateOffer.isPending}
							>
								{mode === 'edit' ? 'Update' : 'Create'}
							</Button>
							<Button onClick={createNewOffer} size="small" variant="text" color="primary">
								<i className="fas fa-plus mr-2" />
								or create new
							</Button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
});

type NoOfferMessageProps = {
	onClickNewOffer?: () => void;
};
const NoOfferMessage: FC<NoOfferMessageProps> = React.memo(props => {
	return (
		<div className="p-10 w-full h-full">
			<div className="w-full h-full bg-slate-100 rounded-lg flex flex-col justify-center items-center">
				<i className="fas fa-box-open text-slate-300 text-6xl"></i>
				<div className="text-slate-500 text-2xl">Pick offer from the list below</div>
				<div className="text-slate-500 text-xl">Or create a new one</div>
				<Button
					onClick={() => props.onClickNewOffer && props.onClickNewOffer()}
					variant="outlined"
					size="small"
					color="primary"
					className="mt-2 px-4"
				>
					<i className="fas fa-plus mr-2" />
					New Offer
				</Button>
			</div>
		</div>
	);
});
