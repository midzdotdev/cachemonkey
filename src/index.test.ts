import { beforeEach, expect, it, vi } from "vitest";
import { type StorageDriver, createResource } from "./index";

let cacheEntries: Record<string, string> = {};

class MockDriver implements StorageDriver {
	getItem = vi.fn(async (key) => {
		return cacheEntries[key] ?? null;
	});
	setItem = vi.fn(async (key, value) => {
		cacheEntries[key] = value;
	});
}

const mockDriver = new MockDriver();

let testItems: {
	id: number;
	name: string;
}[] = [];

interface TestResourceParams {
	id: number;
}

interface TestResourceValue {
	id: number;
	name: string;
}

const testResourceLoader = vi.fn(
	async (params: TestResourceParams): Promise<TestResourceValue> => {
		const data = testItems.find((data) => data.id === params.id);

		if (!data) {
			throw new Error(`Data not found for id: ${params.id}`);
		}

		return data;
	},
);

const testResource = createResource<TestResourceParams, TestResourceValue>(
	mockDriver,
	{
		getKey: (params) => `test:${params.id}`,
		loader: testResourceLoader,
	},
);

beforeEach(() => {
	vi.restoreAllMocks();

	cacheEntries = {};
	testItems = [];
});

it("should read an item from cache if available", async () => {
	cacheEntries = { "test:1": JSON.stringify({ id: 1, name: "one" }) };
	testItems = [{ id: 1, name: "one" }];

	const data = await testResource.get({ id: 1 });

	expect(mockDriver.getItem).toHaveBeenCalledWith("test:1");
	expect(testResourceLoader).not.toHaveBeenCalled();

	expect(data).toEqual({ id: 1, name: "one" });
});

it("should read through the cache if the item is not found", async () => {
	cacheEntries = {};
	testItems = [{ id: 1, name: "one" }];

	const data = await testResource.get({ id: 1 });

	expect(mockDriver.getItem).toHaveBeenCalledWith("test:1");
	expect(testResourceLoader).toHaveBeenCalledWith({ id: 1 });

	expect(data).toEqual({ id: 1, name: "one" });
});
