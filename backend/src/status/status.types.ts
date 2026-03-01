export type ServiceStatus = {
  id: string;
  name: string;
  provider: string;
  status: string;
  message?: string;
  lastChecked: string;
  incidents: any[];
};
