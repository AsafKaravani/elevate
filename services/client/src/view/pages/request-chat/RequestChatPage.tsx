import { Avatar, Button } from '@mui/material';
import React from 'react';
import { FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery_OfferById, useQuery_ProfileId } from '../../../core/api/api';
import { RequestRow } from '../requests-page/RequestRow';
import { RequestChat } from './RequestChat';

export const RequestChatPage: FC = React.memo(() => {
	const navigate = useNavigate();
	const params = useParams();
	const requestId = parseInt(params.requestId || '');
	const useQuery_request = useQuery_OfferById(requestId);
	const profileId = useQuery_ProfileId();
	const isSeller = profileId === useQuery_request.data?.Offer_by_pk?.Offer?.profile_id;
	const contact = isSeller
		? useQuery_request.data?.Offer_by_pk?.Profile
		: useQuery_request.data?.Offer_by_pk?.Offer?.Profile;

	return (
		<div className="offers-page p-4 h-full flex flex-col">
			<div className="flex gap-2 mb-2">
				<Button variant="text" onClick={() => navigate(-1)}>
					<i className="fas fa-arrow-left me-2"></i>
					Back
				</Button>
			</div>

			<RequestRow
				parentOffer={useQuery_request.data?.Offer_by_pk?.Offer}
				request={useQuery_request.data?.Offer_by_pk}
				sellerView={isSeller}
				hideChat
			/>
			<div className="w-full min-h-0 flex-1 mt-2 flex">
				<RequestChat contact={contact} requestId={requestId} />
			</div>
		</div>
	);
});
