import React from 'react';
import { FC } from 'react';
import { useTranslate } from '../../../core/translations/useTranslate';
import { Button, Divider, MenuItem, Select, Switch, TextField, ToggleButton } from '@mui/material';
import { LiveRequestRow } from './LiveRequestRow';
import Line from './SparkChart';

export const LiveMarketPage: FC = React.memo(() => {
	const t = useTranslate();
	const [selected, setSelected] = React.useState(false);
	return (
		<>
			<h1 className="text-xl mb-2">{t('Live Requests')}</h1>
			<div className="border rounded p-2 mb-2 flex items-center">
				<span className="me-2">Text search</span>
				<TextField
					className="overflow-hidden rounded-lg"
					inputProps={{
						style: { padding: '4px 14px', borderRadius: '40px' }
					}}
				/>
				<Divider orientation="vertical" className="mx-4 h-4" />

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

				<span className="me-2">Match my offers</span>
				<Switch />

				<Button variant="outlined" className="ms-auto">
					<i className="fa-solid fa-filter me-2"></i>
					Filter
				</Button>
			</div>
			<div className="mb-5 flex flex-col gap-2">
				<LiveRequestRow
					productName="Brazillian coffee bean"
					requestedArrivalDate={new Date('12/20/23')}
					totalKg={1000}
					kgPerPack={10}
					pricePerKg={2}
					companyName="Starbuck LTD"
					rating={4.5}
					destenation="Argentina"
				/>
				<LiveRequestRow
					productName="Cuban roasted coffee"
					requestedArrivalDate={new Date('01/3/24')}
					totalKg={1400}
					kgPerPack={28}
					pricePerKg={3.4}
					companyName="My Coffee LTD"
					rating={4.5}
					destenation="Germany"
				/>
			</div>
			<Divider className="mb-2" />
			<h1 className="text-xl mb-2">{t('Market Prices')}</h1>

			<div className="border rounded p-2 mb-2 flex items-center">
				<span className="me-2">Text search</span>
				<TextField
					className="overflow-hidden rounded-lg"
					inputProps={{
						style: { padding: '4px 14px', borderRadius: '40px' }
					}}
				/>
				<Divider orientation="vertical" className="mx-4 h-4" />

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

				<span className="me-2">Match my offers</span>
				<Switch />

				<Button variant="outlined" className="ms-auto">
					<i className="fa-solid fa-filter me-2"></i>
					Filter
				</Button>
			</div>

			<div className="flex">
				<div className="w-max">
					<div className="w-full flex items-center gap-4 p-2 bg-slate-200 rounded-s z-10 relative border border-e-0">
						<h1 className="text-lg w-52">Forastero Cocoa</h1>

						<div className="flex flex-col items-center justify-center">
							<Button className="p-0" variant="text">
								<span className="text-sm w-max">36</span>
							</Button>
							<span className="text-xs text-slate-400">producers</span>
						</div>
						<div className="flex flex-col items-center justify-center">
							<span className="text-sm w-max">5 $</span>
							<span className="text-xs w-max text-slate-400">per kg</span>
						</div>
						<div className="flex flex-col items-center justify-center">
							<Line />
						</div>
					</div>
					<div className="w-full flex items-center gap-4 p-2">
						<h1 className="text-lg w-52">Criollo Cocoa</h1>

						<div className="flex flex-col items-center justify-center">
							<Button className="p-0" variant="text">
								<span className="text-sm w-max">12</span>
							</Button>
							<span className="text-xs text-slate-400">producers</span>
						</div>
						<div className="flex flex-col items-center justify-center">
							<span className="text-sm w-max">3.8 $</span>
							<span className="text-xs w-max text-slate-400">per kg</span>
						</div>
						<div className="flex flex-col items-center justify-center">
							<Line />
						</div>
					</div>
					<div className="w-full flex items-center gap-4 p-2">
						<h1 className="text-lg w-52">Trinitario Cocoa</h1>

						<div className="flex flex-col items-center justify-center">
							<Button className="p-0" variant="text">
								<span className="text-sm w-max">17</span>
							</Button>
							<span className="text-xs text-slate-400">producers</span>
						</div>
						<div className="flex flex-col items-center justify-center">
							<span className="text-sm w-max">2.3 $</span>
							<span className="text-xs w-max text-slate-400">per kg</span>
						</div>
						<div className="flex flex-col items-center justify-center">
							<Line />
						</div>
					</div>
				</div>
				<div className="flex-1 bg-slate-200 p-2 rounded-e border relative right-[1px]">
					<h3 className="mb-2">Recent Activity</h3>

					<div className="flex flex-col gap-1 w-full rounded bg-slate-300">
						<div className="flex gap-4 items-center p-1">
							<span className="text-xs text-slate-400">15 minutes ago</span>
							<span className="">
								5,000
								<span className="text-xs text-slate-400"> (kg)</span>
							</span>

							<span className="">
								5$
								<span className="text-xs text-slate-400"> (per kg)</span>
							</span>
							<div className="flex items-center gap-1">
								<img src={`https://flagsapi.com/${'BR'}/flat/32.png`} className="h-4" />
								<i className="fa-solid fa-arrow-right text-lime-600"></i>
								<img src={`https://flagsapi.com/${'IL'}/flat/32.png`} className="h-4" />
							</div>
						</div>
						<Divider className="mx-2" />

						<div className="flex gap-4 items-center p-1">
							<span className="text-xs text-slate-400">27 minutes ago</span>
							<span className="">
								5,000
								<span className="text-xs text-slate-400"> (kg)</span>
							</span>

							<span className="">
								6.2$
								<span className="text-xs text-slate-400"> (per kg)</span>
							</span>
							<div className="flex items-center gap-1">
								<img src={`https://flagsapi.com/${'AR'}/flat/32.png`} className="h-4" />
								<i className="fa-solid fa-arrow-right text-lime-600"></i>
								<img src={`https://flagsapi.com/${'DE'}/flat/32.png`} className="h-4" />
							</div>
						</div>

						<Divider className="mx-2" />

						<div className="flex gap-4 items-center p-1">
							<span className="text-xs text-slate-400">1 hour ago</span>
							<span className="">
								5,000
								<span className="text-xs text-slate-400"> (kg)</span>
							</span>

							<span className="">
								4.9$
								<span className="text-xs text-slate-400"> (per kg)</span>
							</span>
							<div className="flex items-center gap-1">
								<img src={`https://flagsapi.com/${'PR'}/flat/32.png`} className="h-4" />
								<i className="fa-solid fa-arrow-right text-lime-600"></i>
								<img src={`https://flagsapi.com/${'IT'}/flat/32.png`} className="h-4" />
							</div>
						</div>

						<Divider className="mx-2" />

						<div className="flex gap-4 items-center p-1">
							<span className="text-xs text-slate-400">15 minutes ago</span>
							<span className="">
								5,000
								<span className="text-xs text-slate-400"> (kg)</span>
							</span>

							<span className="">
								5$
								<span className="text-xs text-slate-400"> (per kg)</span>
							</span>
							<div className="flex items-center gap-1">
								<img src={`https://flagsapi.com/${'BR'}/flat/32.png`} className="h-4" />
								<i className="fa-solid fa-arrow-right text-lime-600"></i>
								<img src={`https://flagsapi.com/${'IL'}/flat/32.png`} className="h-4" />
							</div>
						</div>
						<Divider className="mx-2" />

						<div className="flex gap-4 items-center p-1">
							<span className="text-xs text-slate-400">27 minutes ago</span>
							<span className="">
								5,000
								<span className="text-xs text-slate-400"> (kg)</span>
							</span>

							<span className="">
								6.2$
								<span className="text-xs text-slate-400"> (per kg)</span>
							</span>
							<div className="flex items-center gap-1">
								<img src={`https://flagsapi.com/${'AR'}/flat/32.png`} className="h-4" />
								<i className="fa-solid fa-arrow-right text-lime-600"></i>
								<img src={`https://flagsapi.com/${'DE'}/flat/32.png`} className="h-4" />
							</div>
						</div>

						<Divider className="mx-2" />

						<div className="flex gap-4 items-center p-1">
							<span className="text-xs text-slate-400">1 hour ago</span>
							<span className="">
								5,000
								<span className="text-xs text-slate-400"> (kg)</span>
							</span>

							<span className="">
								4.9$
								<span className="text-xs text-slate-400"> (per kg)</span>
							</span>
							<div className="flex items-center gap-1">
								<img src={`https://flagsapi.com/${'PR'}/flat/32.png`} className="h-4" />
								<i className="fa-solid fa-arrow-right text-lime-600"></i>
								<img src={`https://flagsapi.com/${'IT'}/flat/32.png`} className="h-4" />
							</div>
						</div>

						<Divider className="mx-2" />

						<div className="flex gap-4 items-center p-1">
							<span className="text-xs text-slate-400">15 minutes ago</span>
							<span className="">
								5,000
								<span className="text-xs text-slate-400"> (kg)</span>
							</span>

							<span className="">
								5$
								<span className="text-xs text-slate-400"> (per kg)</span>
							</span>
							<div className="flex items-center gap-1">
								<img src={`https://flagsapi.com/${'BR'}/flat/32.png`} className="h-4" />
								<i className="fa-solid fa-arrow-right text-lime-600"></i>
								<img src={`https://flagsapi.com/${'IL'}/flat/32.png`} className="h-4" />
							</div>
						</div>
						<Divider className="mx-2" />

						<div className="flex gap-4 items-center p-1">
							<span className="text-xs text-slate-400">27 minutes ago</span>
							<span className="">
								5,000
								<span className="text-xs text-slate-400"> (kg)</span>
							</span>

							<span className="">
								6.2$
								<span className="text-xs text-slate-400"> (per kg)</span>
							</span>
							<div className="flex items-center gap-1">
								<img src={`https://flagsapi.com/${'AR'}/flat/32.png`} className="h-4" />
								<i className="fa-solid fa-arrow-right text-lime-600"></i>
								<img src={`https://flagsapi.com/${'DE'}/flat/32.png`} className="h-4" />
							</div>
						</div>

						<Divider className="mx-2" />

						<div className="flex gap-4 items-center p-1">
							<span className="text-xs text-slate-400">1 hour ago</span>
							<span className="">
								5,000
								<span className="text-xs text-slate-400"> (kg)</span>
							</span>

							<span className="">
								4.9$
								<span className="text-xs text-slate-400"> (per kg)</span>
							</span>
							<div className="flex items-center gap-1">
								<img src={`https://flagsapi.com/${'PR'}/flat/32.png`} className="h-4" />
								<i className="fa-solid fa-arrow-right text-lime-600"></i>
								<img src={`https://flagsapi.com/${'IT'}/flat/32.png`} className="h-4" />
							</div>
						</div>

						<Divider className="mx-2" />

						<div className="flex gap-4 items-center p-1">
							<span className="text-xs text-slate-400">15 minutes ago</span>
							<span className="">
								5,000
								<span className="text-xs text-slate-400"> (kg)</span>
							</span>

							<span className="">
								5$
								<span className="text-xs text-slate-400"> (per kg)</span>
							</span>
							<div className="flex items-center gap-1">
								<img src={`https://flagsapi.com/${'BR'}/flat/32.png`} className="h-4" />
								<i className="fa-solid fa-arrow-right text-lime-600"></i>
								<img src={`https://flagsapi.com/${'IL'}/flat/32.png`} className="h-4" />
							</div>
						</div>
						<Divider className="mx-2" />

						<div className="flex gap-4 items-center p-1">
							<span className="text-xs text-slate-400">27 minutes ago</span>
							<span className="">
								5,000
								<span className="text-xs text-slate-400"> (kg)</span>
							</span>

							<span className="">
								6.2$
								<span className="text-xs text-slate-400"> (per kg)</span>
							</span>
							<div className="flex items-center gap-1">
								<img src={`https://flagsapi.com/${'AR'}/flat/32.png`} className="h-4" />
								<i className="fa-solid fa-arrow-right text-lime-600"></i>
								<img src={`https://flagsapi.com/${'DE'}/flat/32.png`} className="h-4" />
							</div>
						</div>

						<Divider className="mx-2" />

						<div className="flex gap-4 items-center p-1">
							<span className="text-xs text-slate-400">1 hour ago</span>
							<span className="">
								5,000
								<span className="text-xs text-slate-400"> (kg)</span>
							</span>

							<span className="">
								4.9$
								<span className="text-xs text-slate-400"> (per kg)</span>
							</span>
							<div className="flex items-center gap-1">
								<img src={`https://flagsapi.com/${'PR'}/flat/32.png`} className="h-4" />
								<i className="fa-solid fa-arrow-right text-lime-600"></i>
								<img src={`https://flagsapi.com/${'IT'}/flat/32.png`} className="h-4" />
							</div>
						</div>

						<Divider className="mx-2" />
					</div>
				</div>
			</div>
		</>
	);
});
