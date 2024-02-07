import { TextField, Divider, Select, MenuItem, Switch, Button } from '@mui/material';
import React, { useState } from 'react';
import { FC } from 'react';
import { useTranslate } from '../../../core/translations/useTranslate';
import { LiveRequestRow } from '../live-market/LiveRequestRow';
import { OfferRow } from './OfferRow';
import { useQuery_FindOffers } from '../../../core/api/api';

export const MarketplacePage: FC = React.memo(() => {
	const t = useTranslate();
	const [search, setSearch] = useState('');
	const query_Offers = useQuery_FindOffers(search);

	return (
		<div className="p-4">
			<h1 className="text-xl mb-2">{t('Marketplace')}</h1>
			<div className="border rounded p-2 mb-2 flex items-center">
				<span className="me-2">Text search</span>
				<TextField
					value={search}
					onChange={e => setSearch(e.target.value)}
					className="overflow-hidden rounded-lg"
					inputProps={{
						style: { padding: '4px 14px', borderRadius: '40px' }
					}}
				/>
				<Divider orientation="vertical" className="mx-4 h-4" />
				{/* 
				<span className="me-2">Category</span>
				<Select defaultValue={0}>
					<MenuItem value={0}>All</MenuItem>
					<MenuItem value={10}>
						<i className="fa-solid fa-candy-bar me-2"></i>
						Cacao
					</MenuItem>
					<MenuItem value={20}>
						<i className="fa-solid fa-coffee-bean me-2"></i>
						Coffee
					</MenuItem>
					<MenuItem value={30}>
						<i className="fa-solid fa-acorn me-2"></i>
						Nuts
					</MenuItem>
				</Select>
				<Divider orientation="vertical" className="mx-4 h-4 " />

				<span className="me-2">
					Quantity
					<span className="text-xs opacity-30"> (kg)</span>
				</span>
				<TextField
					type="number"
					className="overflow-hidden rounded-lg w-20"
					inputProps={{
						style: { padding: '4px 14px', borderRadius: '40px' }
					}}
				/>

				<Divider orientation="vertical" className="mx-4 h-4" />
				<span className="me-2">
					Packing
					<span className="text-xs opacity-30"> (kg)</span>
				</span>
				<TextField
					type="number"
					className="overflow-hidden rounded-lg w-20"
					inputProps={{
						style: { padding: '4px 14px', borderRadius: '40px' }
					}}
				/> */}
			</div>

			<h1 className="text-xl mb-2 mt-4">{t('Found Offers')}</h1>
			<div className="flex flex-col gap-4">
				{query_Offers.data?.Offer?.map(offer => (
					<OfferRow
						key={offer.id}
						productId={offer.product_id}
						offerId={offer.id}
						productName={offer.Product.name}
						totalKg={offer.quantity}
						kgPerPack={offer.packaging}
						harvestDate={offer.harvest_date}
						pricePerKg={offer.price_per_unit}
					/>
				))}
			</div>
		</div>
	);
});
