import React, { FC, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AppForm } from '../../../core/form/AppForm';
import { Avatar, Button, CircularProgress, Grow } from '@mui/material';
import moment from 'moment';
import { useMutation_CreateOfferMessage, useQuery_MessagesByOfferId, useQuery_ProfileId } from '../../../core/api/api';
import { useInterval } from 'usehooks-ts';

interface RequestChatProps extends React.PropsWithChildren {
	contact?: {
		id?: number;
		first_name?: string;
		last_name?: string;
		picture_url?: string;
	};
	requestId?: number;
}

export const RequestChat: FC<RequestChatProps> = React.memo(props => {
	const mutation_createMessage = useMutation_CreateOfferMessage();
	const query_messages = useQuery_MessagesByOfferId(props.requestId);
	useInterval(() => query_messages.refetch(), 3000);

	const profileId = useQuery_ProfileId();
	const form = useForm({ defaultValues: { message: '' } });
	const onSubmit = form.handleSubmit(data => {
		if (!data.message) return;
		console.log(data.message);
		mutation_createMessage.mutate(
			{
				offer_id: props.requestId,
				message: data.message
			},
			{
				onSuccess: () => {
					form.reset();
				}
			}
		);
	});

	useEffect(() => {
		if (query_messages.data) {
			msgsContainer.current?.scrollTo({
				top: msgsContainer.current.scrollHeight,
				behavior: 'smooth'
			});
		}
	}, [query_messages.data?.OfferMessage.length]);

	const msgsContainer = React.useRef<HTMLDivElement>(null);

	return (
		<div className="w-full h-full bg-slate-100 rounded-md flex flex-col overflow-hidden">
			<div className="p-2 w-full bg-slate-200">
				<div className=" flex items-center">
					<span className="rounded-md flex gap-2 items-center">
						<Avatar src={props.contact?.picture_url} className="h-8 w-8" />
						{props.contact?.first_name} {props.contact?.last_name}
					</span>
				</div>
			</div>
			<div ref={msgsContainer} className="flex-1 w-full p-2 overflow-auto">
				{query_messages.data?.OfferMessage.map((msg, i) => (
					<Message
						key={msg.id}
						message={msg.message}
						time={msg.created_at}
						mine={msg.profile_id === profileId}
						prevMessage={query_messages.data?.OfferMessage[i - 1]}
					/>
				))}
			</div>
			<div className="p-2 py-1 flex gap-2 items-start">
				<div className="flex-1">
					<AppForm
						form={form}
						disabled={mutation_createMessage.isPending}
						onSubmit={onSubmit}
						noSubmit
						fields={[{
							name: 'message',
							type: 'text',
							placeholder: 'Type your message here',
							grid: { colSpan: 12 },
							autoComplete: 'off'
						}]}
					/>
				</div>
				<div className="flex gap-1">
					<Button
						variant="contained"
						className="h-[43px]"
						onClick={onSubmit}
						disabled={mutation_createMessage.isPending}
					>
						{!mutation_createMessage.isPending ? (
							<i className="fas fa-paper-plane me-2"></i>
						) : (
							<CircularProgress size={15} className="text-white me-2" />
						)}
						Send
					</Button>
					<Button variant="contained" className="h-[43px]" onClick={onSubmit}>
						<i className="fas fa-rotate me-2"></i>
						Counter Offer
					</Button>
					<Button variant="contained" className="h-[43px] bg-lime-500" onClick={onSubmit}>
						<i className="fas fa-handshake me-2"></i>
						Accept
					</Button>
				</div>
			</div>
		</div>
	);
});

type Message = {
	message?: string;
	time?: Date;
	seen?: boolean;
	mine?: boolean;
	prevMessage?: Message;
};

const Message: FC<{ message?: string; time?: Date; seen?: boolean; mine?: boolean; prevMessage: Message }> = props => {
	const msgClass = props.mine ? 'ms-auto bg-lime-100 ps-5' : 'bg-white pe-5';
	const [checked, setChecked] = useState(false);
	useEffect(() => {
		if (!checked) setChecked(true);
	}, [checked]);
	const dateText = moment(props.time).format('DD/MM/YY');
	const prevMessageDateText = moment(props.prevMessage?.time).format('DD/MM/YY');
	const showDate = !props.prevMessage || dateText !== prevMessageDateText;
	return (
		<>
			{showDate && (
				<Grow in={checked} style={{ transformOrigin: `center` }} {...(checked ? { timeout: 1000 } : {})}>
					<div className="text-xs w-full flex justify-center mb-2">
						<span className="opacity-50 bg-slate-300 p-1 px-2 rounded">{moment(props.time).format('DD/MM/YY')}</span>
					</div>
				</Grow>
			)}
			<Grow
				in={checked}
				style={{ transformOrigin: `center ${props.mine ? 'right' : 'left'}` }}
				{...(checked ? { timeout: 1000 } : {})}
			>
				<div className={`${msgClass} max-w-[60%] w-max p-2 mb-2 rounded-lg `}>
					{props.message}
					<span className="opacity-50 ms-2 text-xs">{moment(props.time).format('HH:mm')}</span>
					{props.seen && <i className="opacity-25 ms-1 text-xs fas fa-eye"></i>}
				</div>
			</Grow>
		</>
	);
};
