import { DefaultError, QueryClient, UseMutationOptions, useMutation, useQuery } from '@tanstack/react-query';
import { chain, scalars } from '../../generated/zeus/chain';
import { ModelTypes, ValueTypes, order_by } from '../../generated/zeus';
import { useAuth, useAuthId } from '../firebase/firebase';
import toast, { Renderable, Toast, ValueOrFunction } from 'react-hot-toast';
import { useRef } from 'react';
import { queryClient } from './query-client';
import { useAppMutation } from './hooks';


// ---- Profile --------------------------------------------------------------------------
export type Profile = DeepPartial<ModelTypes['Profile']>;

export const useQuery_Profile = () => {
	const [user] = useAuth();
	return useQuery({
		enabled: !!user?.email,
		queryKey: ['profile'],
		queryFn: () =>
			chain('query', { scalars })({
				Profile: [{
					where: {
						email: { _eq: user!.email }
					}
				}, {
					id: true,
					email: true,
					first_name: true,
					last_name: true,
					phone: true,
					picture_url: true,
					updated_at: true,
					created_at: true
				}]
			})
	});
};

export const useQuery_ProfileId = () => {
	const query_Profile = useQuery_Profile();
	return query_Profile.data?.Profile?.[0]?.id;
};

export const useMutation_CreateProfile = () => {
	const [user] = useAuth();
	return useMutation({
		mutationFn: (profile: DeepPartial<ModelTypes['Profile']>) => {
			return chain('mutation', { scalars })({
				insert_Profile_one: [{
					object: {
						...toInput(profile),
						email: user!.email
					}
				}, {
					id: true
				}]
			});
		},
		onSettled: (data, error) => {
			queryClient.invalidateQueries({ queryKey: ['profile'] });
		}
	});
};

export const useMutation_UpdateProfile = () => {
	const [user] = useAuth();
	const toastIdRef = useRef<string>();
	return useMutation({
		mutationFn: (profile: DeepPartial<ModelTypes['Profile']>) => {
			toastIdRef.current = toast.loading('Updating profile...');
			return chain('mutation', { scalars })({
				update_Profile: [{
					where: {
						email: { _eq: user!.email }
					},
					_set: {
						...profile,
						email: user!.email
					}
				}, {
					affected_rows: true,
					returning: {
						id: true
					}
				}]
			});
		},
		onSettled: (data, error) => {
			error && console.error(error);
			queryClient.invalidateQueries({ queryKey: ['profile'] });
			if (error) toast.error('Error updating profile', { id: toastIdRef.current });
			else toast.success('Profile updated successfully', { id: toastIdRef.current });
		}
	});
};


// ---- Type ----------------------------------------------------------------------------
export type DeviceType = DeepPartial<ModelTypes['DeviceType']>;

export const useQuery_AllDeviceTypes = () => {
	return useQuery({
		queryKey: ['allDeviceTypes'],
		queryFn: () =>
			chain('query', { scalars })({
				DeviceType: [{
					
				}, {
					id: true,
					name: true,
					created_at: true,
					updated_at: true
				}]
			})
	});
}



export const useMutation_CreateDeviceType = () => {
	return useAppMutation({
		mutationFn: (deviceType: DeviceType) => {
			return chain('mutation', { scalars })({
				insert_DeviceType_one: [{
					object: toInput(deviceType)
				}, {
					id: true
				}]
			});
		},
		onSettled: (data, error) => {
			queryClient.invalidateQueries({ queryKey: ['allDeviceTypes'] });
		},
		toast: {
			loading: 'יוצר סוג...',
			success: 'סוג נוצר בהצלחה',
			error: 'שגיאה ביצירת סוג'
		}
	}, queryClient);

}


// ---- Utils ----------------------------------------------------------------------------
// A function that loop over keys of object and if the key's first latter is uppercase then nest the value in {data: value}
export const toInput = (obj: any) => {
	Object.keys(obj).forEach(key => obj[key] === '' && delete obj[key]);
	const newObj: any = {};
	for (const key in obj) {
		if (obj[key] === null) continue;
		const isFirstLatterUppercase = key[0] === key[0].toUpperCase();
		if (isFirstLatterUppercase) {
			newObj[key] = {};
			newObj[key].data = obj[key];
		} else {
			newObj[key] = obj[key];
		}
	}
	return newObj;
};

export const toUpdate = (obj: any) => {
	const newObj: any = {};
	for (const key in obj) {
		const isFirstLatterUppercase = key[0] === key[0].toUpperCase();
		if (!isFirstLatterUppercase) newObj[key] = obj[key];
	}
	return newObj;
};

type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
	  }
	: T;
