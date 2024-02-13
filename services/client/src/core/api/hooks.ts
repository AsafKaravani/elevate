import { DefaultError, UseMutationOptions, QueryClient, useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import toast, { ValueOrFunction, Renderable, Toast } from "react-hot-toast";

type AppMutationOptions = {
	toast?: {
		loading: ValueOrFunction<Renderable, Toast>;
		success: ValueOrFunction<Renderable, Toast>;
		error: ValueOrFunction<Renderable, Toast>;
	};
}
type useMutationOptions<T, TError = DefaultError, TVariables = void, TContext = unknown> = UseMutationOptions<T, TError, TVariables, TContext> & AppMutationOptions;

export const useAppMutation = <T, TError = DefaultError, TVariables = void, TContext = unknown>(options: useMutationOptions<T, TError, TVariables, TContext> , queryClient: QueryClient) => {
	const toastIdRef = useRef<string>();

	const originMutationFn = options.mutationFn!;
	options.mutationFn = (variables) => {
		if (toastIdRef.current) return new Promise((res, rej) => {rej('Another mutation is in progress')});
		if (options.toast) toastIdRef.current = toast.loading(options.toast.loading);
		return originMutationFn(variables);
	}

	const originOnSettled = options.onSettled!;
	options.onSettled = (data: any, error: any, variables, context) => {
		error && console.error(error);
		if (error == 'Another mutation is in progress') return new Promise(() => {});
		if (options.toast) {
			if (error) toast.error(options.toast.error, { id: toastIdRef.current });
			else toast.success(options.toast.success, { id: toastIdRef.current });
			toastIdRef.current = undefined;
		}
		return originOnSettled(data, error, variables, context);
	}

	return useMutation(options, queryClient);
};