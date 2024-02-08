import React, { useEffect } from 'react';
import { FC } from 'react';
import { useCreateProfileIfNoProfile } from './useCreateProfileIfNoProfile';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import './styles.css';
import { Button } from '@mui/material';
import { Swiper as SwiperType } from 'swiper/types';
import { ProfileForm } from './ProfileForm';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '../../layout/useDevice';

export const OnboardingPage: FC = React.memo(() => {
	const swiperRef = React.useRef<SwiperType | null>(null);
	const navigate = useNavigate();
	useCreateProfileIfNoProfile();
	const device = useDevice();
	return (
		<div className="onboarding-page flex items-center flex-col h-full py-4 w-screen overflow-hidden">
			<div className=" flex justify-center w-full h-5/6 lg:h-1/2 mt-4">
				<Swiper
					// install Swiper modules
					modules={[Pagination]}
					slidesPerView={device.isMobile ? 1 : 2}
					spaceBetween={10}
					centeredSlides={true}
					pagination={true}
					allowTouchMove={false}
					onSwiper={swiper => (swiperRef.current = swiper)}
					onSlideChange={() => console.log('slide change')}
				>
					<SwiperSlide className='p-4'>
						<span className="text-3xl font-bold">Welcome to Elevate!</span>
						<span className="text-xl opacity-70 ">Before we start, lets get to know each other ok?</span>
						<span className="h-8"></span>
						<Button onClick={() => swiperRef.current?.slideNext()}>
							Start
							<i className="fas fa-arrow-right ms-2"></i>
						</Button>

					</SwiperSlide>
					<SwiperSlide>
						<ProfileForm onSubmitSuccess={() => swiperRef.current?.slideNext()} />

					</SwiperSlide>
					<SwiperSlide>
						<span className="text-3xl font-bold">Thank you!</span>
						<span className="text-xl opacity-70 ">Now, to the farmers!</span>
						<span className="h-8"></span>

						<Button onClick={() => navigate('/s/home')}>
							Go To Homepage
							<i className="fas fa-arrow-right ms-2"></i>
						</Button>

					</SwiperSlide>
				</Swiper>
			</div>
		</div>
	);
});
