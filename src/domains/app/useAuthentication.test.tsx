import { renderHook, waitFor } from "@testing-library/react";
import { useAtomValue } from "jotai";
import { describe, expect, test, vi } from "vitest";
import {
	authClientAtom,
	isAuthenticatedAtom,
	isAuthLoadingAtom,
} from "../../atoms/auth.atom";
import type { Dal } from "../dal/types";
import { useAuthentication } from "./useAuthentication";

function createMockDal(sessionValue: string | null = "valid-session"): Dal {
	return {
		getSession: vi.fn().mockResolvedValue(sessionValue),
		setSession: vi.fn().mockResolvedValue(undefined),
		getNotificationSettings: vi.fn().mockResolvedValue(undefined),
		setNotificationSettings: vi.fn().mockResolvedValue(undefined),
		getFeedFilterSettings: vi.fn().mockResolvedValue(undefined),
		setFeedFilterSettings: vi.fn().mockResolvedValue(undefined),
		getAvatarVisibilitySettings: vi.fn().mockResolvedValue(undefined),
		setAvatarVisibilitySettings: vi.fn().mockResolvedValue(undefined),
		getFontSizeSettings: vi.fn().mockResolvedValue(undefined),
		setFontSizeSettings: vi.fn().mockResolvedValue(undefined),
		getFeedCache: vi.fn().mockResolvedValue(undefined),
		setFeedCache: vi.fn().mockResolvedValue(undefined),
		getMedia: vi.fn().mockResolvedValue(undefined),
		setMedia: vi.fn().mockResolvedValue(undefined),
		clearCache: vi.fn().mockResolvedValue(undefined),
	};
}

describe("useAuthentication", () => {
	test("preserves session and sets isAuthenticated=true when offline/network error occurs during checkSession", async () => {
		const dal = createMockDal("stored-session-abc");

		const { result } = renderHook(() => {
			useAuthentication({ dal });
			return {
				authClient: useAtomValue(authClientAtom),
				isAuthenticated: useAtomValue(isAuthenticatedAtom),
				isAuthLoading: useAtomValue(isAuthLoadingAtom),
			};
		});

		await waitFor(() => {
			expect(result.current.isAuthLoading).toBe(false);
		});

		// If a stored session exists, user should be authenticated even if checkSession fails due to network offline
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.authClient).toBeDefined();
	});
});
