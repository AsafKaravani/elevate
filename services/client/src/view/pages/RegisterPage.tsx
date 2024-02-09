import { Button, CircularProgress, TextField } from '@mui/material';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useCreateUser } from '../../core/firebase/firebase';
import { LanguagePicker } from '../../core/translations/LanguagePicker';
import { useTranslate } from '../../core/translations/useTranslate';

type RegisterFormFields = {
	email: string;
	password: string;
	password2: string;
};

export const RegisterPage: FC = () => {
	const t = useTranslate();
	const navigate = useNavigate();
	const [createUserWithEmailAndPassword, user, loading] = useCreateUser();

	const { register, handleSubmit } = useForm<RegisterFormFields>();
	const onSubmit: SubmitHandler<RegisterFormFields> = form => {
		if (form.password !== form.password2) {
			return;
		}
		createUserWithEmailAndPassword(form.email, form.password);
	};

	useEffect(() => {
		if (user) {
			navigate('/login');
		}
	}, [user, navigate]);

	return (
		<div className="flex flex-col justify-center items-center bg-slate-200 h-screen">
			<div className="flex flex-col items-center gap-4 bg-white p-10 h-min shadow-lg w-1/3 min-w-[350px] max-w-[90vw] rounded relative">
				<div className="absolute top-0 left-0 p-4">
					{/* <LanguagePicker /> */}
				</div>
				<h1 className="text-5xl font-bold mb-4">Elevate</h1>
				<form className="flex flex-col items-center gap-4 w-4/5" onSubmit={handleSubmit(onSubmit)}>
					<TextField {...register('email')} placeholder={t('Email')} fullWidth />
					<TextField {...register('password')} type="password" placeholder={t('Password')} fullWidth />
					<TextField {...register('password2')} type="password" placeholder={t('Verify password')} fullWidth />
					<Button type="submit" className="px-10" disabled={loading}>
						{t('Register')}
					</Button>
					{loading && <CircularProgress color="inherit" size={24} />}
				</form>
				<Button onClick={() => navigate('/login')} variant="text" color="inherit" className="text-slate-400 w-4/5">
					{t('I already have an account')}
				</Button>
			</div>
			<div className="mt-5 mb-60">
				<p className="text-sm opacity-50">{t('© 2023 Elevate. All rights reserved.')}</p>
			</div>
		</div>
	);
};
