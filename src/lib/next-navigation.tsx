import React, { useEffect, useState, useCallback } from 'react';

const NAVIGATION_EVENT = 'nextjs:navigation';

export function navigateTo(href: string, replace = false) {
  if (typeof window === 'undefined') return;
  if (replace) {
    window.history.replaceState({}, '', href);
  } else {
    window.history.pushState({}, '', href);
  }
  window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, { detail: { href } }));
}

export function usePathname(): string {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname || '/' : '/'
  );

  useEffect(() => {
    const update = () => {
      setPathname(window.location.pathname || '/');
    };
    window.addEventListener('popstate', update);
    window.addEventListener(NAVIGATION_EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(NAVIGATION_EVENT, update);
    };
  }, []);

  return pathname;
}

export function useRouter() {
  const push = useCallback((href: string) => {
    navigateTo(href, false);
  }, []);

  const replace = useCallback((href: string) => {
    navigateTo(href, true);
  }, []);

  const back = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }, []);

  const refresh = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT));
    }
  }, []);

  return {
    push,
    replace,
    back,
    refresh,
    prefetch: async () => {},
  };
}

export function useSearchParams(): URLSearchParams {
  const [params, setParams] = useState<URLSearchParams>(() =>
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams()
  );

  useEffect(() => {
    const update = () => {
      setParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener('popstate', update);
    window.addEventListener(NAVIGATION_EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(NAVIGATION_EVENT, update);
    };
  }, []);

  return params;
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  const pathname = usePathname();
  const params: Record<string, string> = {};

  const doctorMatch = pathname.match(/^\/doctors\/([^/?#]+)/);
  if (doctorMatch && doctorMatch[1]) {
    params.id = decodeURIComponent(doctorMatch[1]);
  }

  const patientMatch = pathname.match(/^\/patients\/([^/?#]+)/);
  if (patientMatch && patientMatch[1]) {
    params.id = decodeURIComponent(patientMatch[1]);
  }

  return params as T;
}

export function redirect(href: string) {
  navigateTo(href, true);
}
