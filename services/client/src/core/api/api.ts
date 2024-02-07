import { useMutation, useQuery } from '@tanstack/react-query';
import { chain, scalars } from '../../generated/zeus/chain';
import { ModelTypes, ValueTypes, order_by } from '../../generated/zeus';
import { useAuth, useAuthId } from '../firebase/firebase';
import toast from 'react-hot-toast';
import { useRef } from 'react';
import { queryClient } from './query-client';


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
