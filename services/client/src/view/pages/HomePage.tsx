import { FC } from 'react';
import { AppForm } from '../../core/form/AppForm';
import { useForm } from 'react-hook-form';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const HomePage: FC = () => {
	const form = useForm();
	const navigate = useNavigate();

	return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 20 }}>
		<div className='w-full p-4 bg-gray-100'>
			<div className='mb-2 font-bold opacity-75'>מצב כללי</div>
			<div className='flex gap-4'>
				<div className='flex flex-col items-center p-4 bg-gray-300 rounded'>
					<span className='text-3xl font-bold'> 18</span>
					<span> פעילות </span>
				</div>
				<div className='flex flex-col items-center p-4 bg-red-300 rounded'>
					<span className='text-3xl font-bold'> 3 </span>
					<span> תקלות </span>
				</div>
			</div>
		</div>
		<div className='w-full px-4 flex gap-2'>
			<div className='flex-1'>
				<AppForm
					form={form}
					noSubmit
					fields={[{name: 'search',  type: 'text', placeholder: 'חיפוש מעלית', helperText:'חיפוש לפי: שם לקוח / מיקום / מזהה מעלית' ,value: '', grid: {colSpan: 12}}]}/>
			</div>
		 	<Button className='px-4 min-h-0 min-w-0 h-[43px]'>
				<i className='fas fa-magnifying-glass'></i>
			</Button>
		</div>
		<div className='px-4 w-full'>
			<div className='w-full bg-gray-100 rounded'>
				<div className='flex justify-between h-full p-4'>
					<div className='flex gap-2 flex-col'>
						<div className='flex gap-2'>
							<span className='font-bold opacity-75'>#03</span>
							<span className='bg-lime-300 px-2 rounded'>תקינה</span>
						</div>
						<div className='flex gap-4'>
							<span>
								<i className='fas fa-user me-2'></i>
								שפיר הנדסה
							</span>
							<span>
								<i className='fas fa-map-marker-alt me-2'></i>
								אשדוד
							</span>
						</div>
					</div>
					
					<div className='flex gap-2'>
						<Button onClick={() => navigate('/s/device/1234')}>פתח</Button>
					</div>
				</div>
			</div>
		</div>
	</div>;
};
