export class StatusResponseDto {
  id: string;
  name: string;
  provider: string;
  status: string;
  message?: string;
  lastChecked: string;
  incidents: any[];
  components: any[];
  recentIncidents: any[];
}
