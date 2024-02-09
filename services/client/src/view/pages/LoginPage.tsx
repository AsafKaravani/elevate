import { Button, CircularProgress, TextField } from '@mui/material';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignInGoogle, useSignInPassword } from '../../core/firebase/firebase';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useTranslate } from '../../core/translations/useTranslate';
import { LanguagePicker } from '../../core/translations/LanguagePicker';

type LoginFormFields = {
	email: string;
	password: string;
	password2: string;
};

export const LoginPage: FC = props => {
	const t = useTranslate();

	const navigate = useNavigate();
	const [
		signInWithEmailAndPassword,
		_,
		loading_signInWithPassword,
		__
	] = useSignInPassword();

	const [signInWithGoogle, user_google] = useSignInGoogle();
	useEffect(() => {
		if (user_google) {
			navigate('/s/home');
		}
	}, [user_google, navigate]);

	const { register, handleSubmit } = useForm<LoginFormFields>();
	const onSubmit: SubmitHandler<LoginFormFields> = async form => {
		const user = await signInWithEmailAndPassword(form.email, form.password);
		if (user) {
			navigate('/s/home');
		}
	};

	return (
		<div className="flex flex-col justify-center items-center bg-slate-200 h-screen">
			<div className="flex flex-col items-center gap-4 bg-white p-10 h-min shadow-lg w-1/3 min-w-[350px] max-w-[90vw] rounded relative">
				<div className="absolute top-0 left-0 p-4">
					{/* <LanguagePicker /> */}
				</div>
				<h1 className="text-5xl font-bold mb-4">Elevate</h1>
				<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center gap-4 w-4/5">
					<TextField {...register('email')} placeholder={t('Email')} fullWidth />
					<TextField {...register('password')} type="password" placeholder={t('Password')} fullWidth />
					<div className='relative flex items-center gap-2'>
						<Button type="submit" className="px-10">
							{t('Login')}
						</Button>
						<div className='h-full absolute right-2 flex items-center text-white'>
							{loading_signInWithPassword && <CircularProgress color="inherit" size={20} />}
						</div>
					</div>
				</form>
				<div className="flex items-center gap-2">
					<div className="h-px bg-gray-300 w-14"></div>
					<p className="text-sm opacity-50 mb-1">{t('or')}</p>
					<div className="h-px bg-gray-300 w-14"></div>
				</div>
				<Button onClick={() => signInWithGoogle()} variant="outlined" className="w-4/5">
					{t('Login with Google')}
					<i className="fa-brands fa-google ms-2"></i>
				</Button>
				<Button
					onClick={() => navigate('/register')}
					variant="outlined"
					color="inherit"
					className="text-slate-400 w-4/5"
				>
					{t('Register with Email')}
				</Button>
			</div>
			<div className="mt-5 mb-60">
				<p className="text-sm opacity-50">{t('© 2023 Elevate. All rights reserved.')}</p>
			</div>
		</div>
	);
};
