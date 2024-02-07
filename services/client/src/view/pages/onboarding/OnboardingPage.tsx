import React, { useEffect } from 'react';
import { FC } from 'react';
import { useMutation_CreateProfile, useQuery_Profile } from '../../../core/api/api';
import { useCreateProfileIfNoProfile } from './useCreateProfileIfNoProfile';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import './styles.css';
import { Button } from '@mui/material';
import { Swiper as SwiperType } from 'swiper/types';
import { ProfileForm } from './ProfileForm';
import { useNavigate } from 'react-router-dom';

export const OnboardingPage: FC = React.memo(() => {
	const query_Profile = useQuery_Profile();
	const mutation_CreateProfile = useMutation_CreateProfile();
	const swiperRef = React.useRef<SwiperType | null>(null);
	const navigate = useNavigate();
	useCreateProfileIfNoProfile();

	return (
		<div className="onboarding-page flex items-center flex-col h-full py-4 w-screen overflow-hidden">
			<div className=" flex justify-center w-full h-1/2 mt-4">
				<Swiper
					// install Swiper modules
					modules={[Pagination]}
					slidesPerView={2}
					spaceBetween={50}
					centeredSlides={true}
					pagination={true}
					allowTouchMove={false}
					onSwiper={swiper => (swiperRef.current = swiper)}
					onSlideChange={() => console.log('slide change')}
				>
					<SwiperSlide>
						<span className="text-3xl font-bold">Welcome to Elevate!</span>
						<span className="text-xl opacity-70 ">Before we start, lets get to know each other ok?</span>
						<span className="h-8"></span>
						<Button onClick={() => swiperRef.current?.slideNext()}>
							Start
							<i className="fas fa-arrow-right ml-2"></i>
						</Button>

						<img src="/art/farmer-smiling.png" className="pointer-events-none absolute -left-48 -bottom-28 scale-75" />
					</SwiperSlide>
					<SwiperSlide>
						<ProfileForm onSubmitSuccess={() => swiperRef.current?.slideNext()} />
						<img
							src="/art/girl-sitting-writing.png"
							className="pointer-events-none absolute -right-[20%] -bottom-[22%] w-[250px] -scale-x-100 z-50"
						/>
					</SwiperSlide>
					<SwiperSlide>
						<span className="text-3xl font-bold">Thank you!</span>
						<span className="text-xl opacity-70 ">Now, to the farmers!</span>
						<span className="h-8"></span>

						<Button onClick={() => navigate('/s/marketplace')}>
							Go To Marketplace
							<i className="fas fa-arrow-right ml-2"></i>
						</Button>
						<img
							src="/art/barista-holds-a-bag-of-coffee-bean.png"
							className="pointer-events-none absolute -right-[60px] bottom-[0] w-[250px] -scale-x-100 z-50"
						/>
					</SwiperSlide>
				</Swiper>
			</div>
		</div>
	);
});
