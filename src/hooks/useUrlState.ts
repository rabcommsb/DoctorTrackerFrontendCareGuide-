'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type UrlStateValue = string | number;

export interface UseUrlStateReturn<T extends Record<string, UrlStateValue>> {
  state: T;
  setParam: <K extends keyof T>(
    key: K,
    value: T[K],
    options?: { resetPage?: boolean }
  ) => void;
  setParams: (
    updates: Partial<T>,
    options?: { resetPage?: boolean }
  ) => void;
  resetParams: () => void;
}

/**
 * Synchronizes pagination (`page`, `pageSize`), `search`, and filter values
 * with the browser URL query string.
 */
export function useUrlState<T extends Record<string, UrlStateValue>>(
  defaultState: T
): UseUrlStateReturn<T> {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo<T>(() => {
    const result = { ...defaultState };

    (Object.keys(defaultState) as Array<keyof T>).forEach((key) => {
      const rawParam = searchParams.get(String(key));
      if (rawParam !== null && rawParam !== '') {
        const defaultVal = defaultState[key];
        if (typeof defaultVal === 'number') {
          const parsed = Number(rawParam);
          if (!Number.isNaN(parsed) && parsed > 0) {
            result[key] = parsed as T[keyof T];
          }
        } else {
          result[key] = rawParam as T[keyof T];
        }
      }
    });

    return result;
  }, [defaultState, searchParams]);

  const setParams = useCallback(
    (updates: Partial<T>, options?: { resetPage?: boolean }) => {
      const current = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        const defaultVal = defaultState[key as keyof T];
        if (
          value === undefined ||
          value === null ||
          value === '' ||
          value === defaultVal
        ) {
          current.delete(key);
        } else {
          current.set(key, String(value));
        }
      });

      const shouldResetPage =
        options?.resetPage ?? (!('page' in updates) && 'page' in defaultState);

      if (shouldResetPage) {
        current.delete('page');
      }

      const queryString = current.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(targetUrl);
    },
    [defaultState, pathname, router, searchParams]
  );

  const setParam = useCallback(
    <K extends keyof T>(
      key: K,
      value: T[K],
      options?: { resetPage?: boolean }
    ) => {
      const partialUpdate: Partial<T> = { [key]: value } as unknown as Partial<T>;
      setParams(partialUpdate, options);
    },
    [setParams]
  );

  const resetParams = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  return {
    state,
    setParam,
    setParams,
    resetParams,
  };
}

export default useUrlState;
