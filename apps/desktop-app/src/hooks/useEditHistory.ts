import { useReducer, useRef } from "react";

const MAX = 50;

export function useEditHistory<T>(initial: T) {
	const pastRef = useRef<T[]>([]);
	const presentRef = useRef<T>(initial);
	const futureRef = useRef<T[]>([]);
	const [, tick] = useReducer((x: number) => x + 1, 0);

	const push = (next: T) => {
		pastRef.current = [
			...pastRef.current.slice(-(MAX - 1)),
			presentRef.current,
		];
		presentRef.current = next;
		futureRef.current = [];
		tick();
	};

	const undo = (): T => {
		if (!pastRef.current.length) return presentRef.current;
		const prev = pastRef.current.at(-1)!;
		futureRef.current = [presentRef.current, ...futureRef.current];
		pastRef.current = pastRef.current.slice(0, -1);
		presentRef.current = prev;
		tick();
		return prev;
	};

	const redo = (): T => {
		if (!futureRef.current.length) return presentRef.current;
		const next = futureRef.current[0];
		pastRef.current = [...pastRef.current, presentRef.current];
		presentRef.current = next;
		futureRef.current = futureRef.current.slice(1);
		tick();
		return next;
	};

	const reset = (next: T) => {
		pastRef.current = [];
		presentRef.current = next;
		futureRef.current = [];
		tick();
	};

	return {
		present: presentRef.current,
		canUndo: pastRef.current.length > 0,
		canRedo: futureRef.current.length > 0,
		push,
		undo,
		redo,
		reset,
	};
}
