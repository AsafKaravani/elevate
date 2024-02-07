import { useEffect } from 'react';
import { useMutation_CreateProfile, useQuery_Profile } from '../../../core/api/api';

export const useCreateProfileIfNoProfile = () => {
	const query_Profile = useQuery_Profile();
	const mutation_CreateProfile = useMutation_CreateProfile();

	useEffect(() => {
		if (query_Profile.isLoading) return;
		const noProfile = query_Profile.data?.Profile.length === 0;
		if (noProfile) {
			console.log('Creating profile');
			mutation_CreateProfile.mutate({});
		}
	}, [query_Profile.data?.Profile]);
};
