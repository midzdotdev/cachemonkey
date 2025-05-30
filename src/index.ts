export interface StorageDriver {
	getItem(key: string): Promise<string | null>;
	setItem(key: string, value: string): Promise<void>;
}

export class MemoryDriver implements StorageDriver {
	private _memory: Record<string, string> = {};

	async getItem(key: string): Promise<string | null> {
		return this._memory[key] ?? null;
	}

	async setItem(key: string, value: string): Promise<void> {
		this._memory[key] = value;
	}
}

export const createResource = <TKeyParams, TValue>(
	driver: StorageDriver,
	config: {
		getKey: (params: TKeyParams) => string;
		loader: (params: TKeyParams) => Promise<TValue>;
		serializer?: (value: TValue) => string;
		deserializer?: (value: string) => TValue;
	},
) => {
	const serializer = config.serializer ?? JSON.stringify;
	const deserializer = config.deserializer ?? JSON.parse;

	return {
		get: async (params: TKeyParams): Promise<TValue> => {
			const key = config.getKey(params);

			const cachedValueRaw = await driver.getItem(key);

			if (cachedValueRaw) {
				return deserializer(cachedValueRaw);
			}

			const value = await config.loader(params);

			if (value) {
				await driver.setItem(key, serializer(value));
			}

			return value;
		},

		set: async (params: TKeyParams, value: TValue): Promise<void> => {
			const key = config.getKey(params);

			await driver.setItem(key, serializer(value));
		},
	};
};
