import React, { FC, useEffect } from 'react';
import { useAuth } from '../firebase/firebase';
import { Profile, useQuery_Profile } from '../api/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { ModelTypes } from '../../generated/zeus';

export const FirstLogin = React.memo(() => {
	const query_Profile = useQuery_Profile();
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		console.log('Checking if first login is required');
		if (query_Profile.isLoading) return;
		const noProfile = query_Profile.data?.Profile.length === 0;
		if (noProfile) {
			console.log('First login required');
			navigate('/s/onboarding');
		} else {
			const profile = query_Profile.data?.Profile[0] || {};
			const missingFields = profileMissingFields(profile);
			if (missingFields.length > 0) {
				console.log('Missing fields: ', missingFields.join(', '));
				navigate('/s/onboarding');
			}
			console.log('No first login required');
		}
	}, [query_Profile.isLoading, query_Profile.data, location.pathname]);

	return <></>;
});

const profileMissingFields = (profile: Profile) => {
	const missingData: Array<string> = [];
	if (!profile.first_name) missingData.push('first name');
	if (!profile.last_name) missingData.push('lastname');
	if (!profile.phone) missingData.push('phone');

	return missingData;
};
