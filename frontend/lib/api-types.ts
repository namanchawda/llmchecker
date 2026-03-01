// frontend/lib/api-types.ts

// Provider (backend entity)
export type ApiProvider = {
  id: string;
  name: string;
  host: string;
};

// current_status_snapshot row
export type ApiCurrentSnapshot = {
  id: string;
  status: string;
  message?: string;
  checkedAt: string;
  provider: ApiProvider;
  incidents?: ApiIncident[];
};

// incident table row
export type ApiIncident = {
  id: string;
  name: string;
  status: string;
  impact?: string;
  startedAt?: string;
  link?: string;
  provider: ApiProvider;
};

// provider_recent_incident row
export type ApiRecentIncident = {
  id: string;
  name: string;
  status: string;
  impact?: string;
  startedAt?: string;
  link?: string;
  provider: ApiProvider;
};

// provider_component_status grouping
export type ApiComponentGroup = {
  providerId: string;
  providerName: string;
  providerHost: string;
  components: {
    id: string;
    name: string;
    status: string;
    description?: string | null;
    group?: string | null;
  }[];
};

// export type ApiIncident = {
//   id: string;
//   name: string;
//   status: string;
//   impact?: string;
//   startedAt?: string;
//   link?: string;
// };

export type LiveStatusSnapshot = {
  id: string;
  status: string;
  message?: string;
  checkedAt: string;
  provider: ApiProvider;
  incidents?: ApiIncident[];
};
