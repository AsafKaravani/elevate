import { Button } from '@mui/material';
import React from 'react';
import { FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const DevicePage: FC = React.memo(() => {
	const navigate = useNavigate();
	return (
		<>
			<div className='w-full bg-gray-100 '>
				<div className='flex flex-col items-start h-full p-4'>
					<Button className='p-0 pb-2 min-w-0' variant='text' onClick={() => navigate(-1)}>
						<i className='fas fa-arrow-left me-2'></i>
					חזור
					</Button>
					<div className='flex gap-2 flex-col'>
						<div className='flex gap-2'>
							<span className='font-bold opacity-75'>#03</span>
							<span className='bg-lime-300 px-2 rounded'>תקינה</span>
							<span>
								<i className='fas fa-wrench me-2 opacity-50'></i>
								Model 2BFX
							</span>
						</div>
						<div className='flex gap-4'>
							<span>
								<i className='fas fa-user me-2 opacity-50'></i>
								שפיר הנדסה
							</span>
							<span>
								<i className='fas fa-map-marker-alt me-2 opacity-50'></i>
								אשדוד
							</span>
						</div>
					</div>
				</div>
			</div>
			<div className='flex justify-center mt-4 gap-2 text-sm opacity-75'>
				<span>
				עדכון אחרון
				</span>
				<span>
				24/02 12:00
				</span>
			</div>
			<div className='flex flex-wrap gap-y-4 p-4'>
				<div className='flex w-full lg:w-1/4 lg:pe-4'>
					<div className='p-2 py-1 ps-4 flex-1  rounded-s border border-lime-300'>
						מתח ראשי
					</div>
					<div className='p-2 py-1 w-1/4 bg-lime-300 rounded-e flex justify-center'>
						יש מתח
					</div>
				</div>
				
				<div className='flex w-full lg:w-1/4 lg:pe-4'>
					<div className='p-2 py-1 ps-4 flex-1  rounded-s border border-lime-300'>
						דלת חיצונית
					</div>
					<div className='p-2 py-1 w-1/4 bg-lime-300 rounded-e flex justify-center'>
						יש מתח
					</div>
				</div>

				<div className='flex w-full lg:w-1/4 lg:pe-4'>
					<div className='p-2 py-1 ps-4 flex-1  rounded-s border border-red-300'>
						דלת פנימית
					</div>
					<div className='p-2 py-1 w-1/4 bg-red-300 rounded-e flex justify-center'>
						אין מתח
					</div>
				</div>

				<div className='flex w-full lg:w-1/4 lg:pe-4'>
					<div className='p-2 py-1 ps-4 flex-1  rounded-s border border-lime-300'>
						מנוע
					</div>
					<div className='p-2 py-1 w-1/4 bg-lime-300 rounded-e flex justify-center'>
						יש מתח
					</div>
				</div>

				<div className='flex w-full lg:w-1/4 lg:pe-4'>
					<div className='p-2 py-1 ps-4 flex-1  rounded-s border border-lime-300'>
						משקל
						&nbsp;
						<span className='text-xs opacity-75'>
						 משקל מקסימלי 350 kg
						</span>
					</div>
					<div className='p-2 py-1 w-1/4 bg-lime-300 rounded-e flex justify-center'>
						327.8 kg
					</div>
				</div>


			</div>
		</>
	);
});
