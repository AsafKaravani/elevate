import React from 'react';
import { FC } from 'react';
import { useQuery_CurrentUserRequests } from '../../../core/api/api';
import moment from 'moment';
import { RequestRow } from './RequestRow';

export const RequestsPage: FC = React.memo(() => {
	const query_CurrentUserRequests = useQuery_CurrentUserRequests();
	return (
		<div className="offers-page p-4 h-full flex flex-col">
			<div className="flex gap-2 mb-2">
				<h1 className="text-xl mb-[9px]">My Requests</h1>
			</div>
			<div className="flex flex-col gap-4">
				{query_CurrentUserRequests.data?.Offer?.map(request => (
					<RequestRow key={request.id} parentOffer={request.Offer} request={request} />
				))}
			</div>
		</div>
	);
});
