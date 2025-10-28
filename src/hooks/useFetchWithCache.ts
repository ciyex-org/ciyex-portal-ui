import { fetchWithAuth } from '@/utils/fetchWithAuth';
import useSWR from 'swr';

interface CacheConfig {
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  refreshInterval?: number;
}

export function useFetchWithCache<T>(url: string | null, config?: CacheConfig) {
  const { data, error, isLoading, mutate } = useSWR<T>(
    url,
    async (url: string) => {
      const res = await fetchWithAuth(url);
      if (!res.ok) {
        throw new Error(`API error: ${await res.text()}`);
      }
      const json = await res.json();
      return json.data as T;
    },
    {
      revalidateOnFocus: config?.revalidateOnFocus ?? false,
      revalidateOnReconnect: config?.revalidateOnReconnect ?? false,
      refreshInterval: config?.refreshInterval,
      shouldRetryOnError: true,
      dedupingInterval: 5000
    }
  );

  return {
    data,
    isLoading,
    error,
    mutate
  };
}