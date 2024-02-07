import { Avatar, Button, CircularProgress, TextField } from '@mui/material';
import React, { useEffect, useRef } from 'react';
import { FC } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useTranslate } from '../../../core/translations/useTranslate';
import { useMutation_UpdateProfile, useQuery_Profile } from '../../../core/api/api';
import toast from 'react-hot-toast';
import { getFileURL, useStorage } from '../../../core/firebase/firebase';
type ProfileFormFields = {
	email: string;
	first_name: string;
	last_name: string;
	phone: string;
	picture_url: string;
};

type ProfileFormProps = {
	onSubmitSuccess?: () => void;
};

export const ProfileForm: FC<ProfileFormProps> = React.memo(props => {
	const t = useTranslate();
	const mutation_UpdateProfile = useMutation_UpdateProfile();
	const query_Profile = useQuery_Profile();
	const profileData = query_Profile.data?.Profile[0];
	const { register, setValue, formState, getValues, watch } = useForm<ProfileFormFields>();
	const formValues = watch();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const storage = useStorage();
	const handleFileUpload: React.ChangeEventHandler<HTMLInputElement> = e => {
		console.log(e.target.files);
		if (!e.target.files) return;
		storage.upload(e.target.files![0].name, e.target.files![0]).then(async res => {
			if (!res?.ref) return;
			const fileUrl = await getFileURL(res?.ref);
			console.log(fileUrl);
			setValue('picture_url', fileUrl);
		});
	};

	console.log(storage);

	const submit = () => {
		const values = getValues();
		let valid = true;
		if (values.first_name === '' || !values.first_name) {
			toast.error('First name is required');
			valid = false;
		}
		if (values.last_name === '' || !values.last_name) {
			toast.error('Last name is required');
			valid = false;
		}
		if (values.phone === '' || !values.phone) {
			toast.error('Phone is required');
			valid = false;
		}

		if (valid) mutation_UpdateProfile.mutate(values);
	};

	useEffect(() => {
		if (!props.onSubmitSuccess) return;
		if (mutation_UpdateProfile.isSuccess) {
			props.onSubmitSuccess();
		}
	}, [mutation_UpdateProfile.isSuccess]);

	useEffect(() => {
		Object.keys(profileData || {}).forEach(key => {
			setValue(key as keyof ProfileFormFields, profileData?.[key]);
		});
	}, [profileData]);

	return (
		<>
			<form className="flex flex-col items-center gap-4 w-4/5 max-w-lg">
				<div className="relative">
					<Button
						onClick={() => fileInputRef.current?.click()}
						className="bg-black transition-all absolute top-0 left-0 w-32 h-32 opacity-0 hover:opacity-80 z-10 rounded-full"
					>
						Upload Photo
					</Button>
					<input
						type="file"
						ref={fileInputRef}
						onChange={handleFileUpload}
						className="hidden"
						accept=".jpg,.jpeg,.png"
					/>
					{storage.uploading ? (
						<div className="w-32 h-32 flex justify-center items-center border-4 border-slate-100 rounded-full bg-slate-300">
							<CircularProgress />
						</div>
					) : (
						<Avatar className="w-32 h-32" src={formValues.picture_url || profileData?.picture_url} />
					)}
				</div>
				<TextField {...register('picture_url')} className="hidden" />
				<span className="flex gap-2 w-full">
					<TextField {...register('first_name', { required: true })} placeholder={t('First name')} fullWidth />
					<TextField {...register('last_name', { required: true })} placeholder={t('Last name')} fullWidth />
				</span>
				<TextField
					{...register('email', { required: true })}
					placeholder={t('Email')}
					disabled
					fullWidth
					inputProps={{ className: 'cursor-not-allowed' }}
				/>
				<TextField {...register('phone', { required: true })} placeholder={t('+972 52-1234-567')} fullWidth />
				<Button onClick={submit} className="mt-2" disabled={mutation_UpdateProfile.isPending}>
					Next
					<i className="fas fa-arrow-right ml-2"></i>
				</Button>
			</form>
		</>
	);
});
