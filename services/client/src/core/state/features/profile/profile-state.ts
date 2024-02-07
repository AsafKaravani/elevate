import { atom } from 'recoil';

type ProfileState = {
	shouldDoOnboarding?: boolean;
};
export const atom_profileState = atom<ProfileState>({
	key: 'profileState',
	default: {
		shouldDoOnboarding: false
	}
});
