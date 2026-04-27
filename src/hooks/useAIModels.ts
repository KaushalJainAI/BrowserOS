import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface AIModel {
  name: string;
  value: string;
  is_free: boolean;
}

export interface AIProvider {
  name: string;
  slug: string;
  icon: string;
  has_credentials: boolean;
  models: AIModel[];
}

export function useAIModels() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ providers: AIProvider[] }>('/api/nodes/models/')
      .then(res => setProviders(res.data.providers))
      .catch(err => console.error('Failed to fetch AI models:', err))
      .finally(() => setIsLoading(false));
  }, []);

  return { providers, isLoading };
}
