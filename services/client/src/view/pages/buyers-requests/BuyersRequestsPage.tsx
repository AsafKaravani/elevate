import React from 'react';
import { FC } from 'react';
import { useQuery_CurrentUserBuyersRequests } from '../../../core/api/api';
import { RequestRow } from '../requests-page/RequestRow';

export const BuyersRequestsPage: FC = React.memo(() => {
	const query_CurrentUserBuyersRequests = useQuery_CurrentUserBuyersRequests();

	return (
		<div className="offers-page p-4 h-full flex flex-col">
			<div className="flex gap-2 mb-2">
				<h1 className="text-xl mb-[9px]">Buyer's Requests</h1>
			</div>
			<div className="flex flex-col gap-4">
				{query_CurrentUserBuyersRequests.data?.Offer?.map(request => (
					<RequestRow key={request.id} parentOffer={request.Offer} request={request} sellerView />
				))}
			</div>
		</div>
	);
});
