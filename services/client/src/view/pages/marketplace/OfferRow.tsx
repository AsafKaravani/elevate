import { Button, Collapse } from '@mui/material';
import React, { FC } from 'react';
import moment from 'moment';
import { CreateRequestForm } from './CreateRequestForm';

interface OfferRowProps extends React.PropsWithChildren {
	productId?: number;
	offerId?: number;
	productName?: string;
	harvestDate?: Date;
	totalKg?: number;
	kgPerPack?: number;
	pricePerKg?: number;
	companyName?: string;
	rating?: number;
	origin?: string;
}

export const OfferRow: FC<OfferRowProps> = React.memo(props => {
	const [buyRequestOpen, setBuyRequestOpen] = React.useState(false);

	return (
		<>
			<div className="w-full bg-slate-100 border-slate-200 border rounded flex flex-col justify-between gap-2 p-2 px-4">
				<div className="flex gap-4 flex-1 items-center">
					<div className="flex-1 flex flex-col h-full justify-center items-start gap-2">
						<h2 className="text-lg max-w-[200px] font-bold">{props.productName}</h2>
					</div>
					<div className="flex overflow-auto w-4/6 justify-between gap-4 pb-1">
						<div className="flex flex-col items-center justify-center">
							<span className="text-xs text-slate-400">{moment(props.harvestDate).fromNow()}</span>
							<span className="text-sm w-max">{moment(props.harvestDate).format('DD/MM/YY')}</span>
							<span className="text-xs text-slate-400">Harvest date</span>
						</div>
						<div className="flex flex-col items-center justify-center">
							<span className="text-xs text-slate-400 opacity-0">.</span>
							<span className="text-sm w-max">{props.totalKg} kg</span>
							<span className="text-xs w-max text-slate-400">kg available</span>
						</div>
						<div className="flex flex-col items-center justify-center">
							<span className="text-xs text-slate-400 opacity-0">.</span>
							<span className="text-sm w-max">{props.kgPerPack} kg</span>
							<span className="text-xs w-max text-slate-400">kg per pack</span>
						</div>
						<div className="flex flex-col items-center justify-center">
							<span className="text-xs text-slate-400 opacity-0">.</span>
							<span className="text-sm w-max">{props.pricePerKg} $</span>
							<span className="text-xs w-max w-max text-slate-400">price per kg</span>
						</div>

						{/* <div className="flex flex-col items-center justify-center">
							<span className="text-xs text-slate-400 opacity-0">.</span>
							<Button className="p-0" variant="text">
								<span className="text-sm w-max w-max">{props.companyName}</span>
							</Button>
							<span className="text-xs text-slate-400">producer</span>
						</div> */}
						{props.rating && (
							<div className="flex flex-col items-center justify-center">
								<span className="text-xs text-slate-400">{props.rating}</span>
								<span className="text-sm w-max">
									{new Array(Math.floor(props.rating)).fill(0)
										.map((_, i) => (
											<i className="fa-solid fa-star text-yellow-400 "></i>
										))}
									{props.rating % 1 > 0 && <i className="fa-solid fa-star-half text-yellow-400 "></i>}
								</span>
								<span className="text-xs text-slate-400">rating</span>
							</div>
						)}
						{/* <div className="flex flex-col items-center justify-center">
							<span className="text-xs text-slate-400 opacity-0">.</span>
							<span className="text-sm flex gap-1 items-center w-max">
								<img src={`https://flagsapi.com/${lookup.byCountry(props.origin)?.iso2}/flat/32.png`} className="h-4" />
								{props.origin} ({props.origin && lookup.byCountry(props.origin)?.iso2})
							</span>
							<span className="text-xs text-slate-400">origin</span>
						</div> */}
						<div className="flex flex-col items-center justify-center">
							<span className="text-xs text-slate-400 opacity-0">.</span>
							<span className="w-max flex gap-2 p-0.5">
								<i className="fa-regular fa-file-certificate "></i>
								<i className="fa-regular fa-trees "></i>
								<i className="fa-regular fa-scale-balanced"></i>
							</span>
							<span className="text-xs text-slate-400">certificates</span>
						</div>
					</div>
					<div className="flex items-center gap-2 ms-4">
						<Button
							onClick={() => setBuyRequestOpen(!buyRequestOpen)}
							className={`min-w-[100px] ${buyRequestOpen && 'bg-red-500'}`}
						>
							{buyRequestOpen ? 'Cancel' : 'Buy'}
						</Button>
					</div>
				</div>
				<Collapse in={buyRequestOpen}>
					<CreateRequestForm
						offerId={props.offerId}
						productId={props.productId}
						onSuccess={() => setBuyRequestOpen(false)}
					/>
				</Collapse>
			</div>
		</>
	);
});
