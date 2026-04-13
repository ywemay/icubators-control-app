import axios from "axios";

export interface IncubatorStatus {
  temperature: number;
  humidity: number;
  target_temperature: number;
  target_humidity: number;
  heater_on: boolean;
  fan_on: boolean;
  light_on: boolean;
  egg_turner_active: boolean;
  time_until_next_turn: number;
  incubation_active: boolean;
  wifi_connected: boolean;
  ip_address: string;
  hostname: string;
  uptime: number;
}

export interface IncubatorConfig {
  target_temp: number;
  turn_interval: number;
  heater_hysteresis: number;
  humidity_hysteresis: number;
  max_heater_on_time: number;
  min_fan_off_time: number;
}

export interface IncubationStatus {
  session_active: boolean;
  species: string;
  elapsed_days: number;
  remaining_days: number;
  is_candling_day: boolean;
  is_lockdown_day: boolean;
  is_hatching_day: boolean;
  time_remaining: string;
  target_temp: number;
  target_humidity: number;
  incubation_days: number;
  candling_day: number;
  lockdown_day: number;
  turn_interval: number;
}

export interface SystemInfo {
  firmware_version: string;
  chip_model: string;
  chip_revision: number;
  cpu_freq_mhz: number;
  free_heap: number;
  min_free_heap: number;
  max_alloc_heap: number;
  psram_size: number;
  flash_size: number;
  sdk_version: string;
  compiled_date: string;
  compiled_time: string;
}

export interface TimeInfo {
  current_time: string;
  current_date: string;
  time_synced: boolean;
  timestamp: number;
}

export enum BirdSpecies {
  QUAIL = 0,
  CHICKEN = 1,
  DUCK = 2,
  GOOSE = 3,
  PEACOCK = 4,
  TURKEY = 5,
  PHEASANT = 6,
  GUINEA_FOWL = 7,
  CUSTOM = 8,
}

export const speciesNames = {
  [BirdSpecies.QUAIL]: "Quail",
  [BirdSpecies.CHICKEN]: "Chicken",
  [BirdSpecies.DUCK]: "Duck",
  [BirdSpecies.GOOSE]: "Goose",
  [BirdSpecies.PEACOCK]: "Peacock",
  [BirdSpecies.TURKEY]: "Turkey",
  [BirdSpecies.PHEASANT]: "Pheasant",
  [BirdSpecies.GUINEA_FOWL]: "Guinea Fowl",
  [BirdSpecies.CUSTOM]: "Custom",
};

export const speciesDays = {
  [BirdSpecies.QUAIL]: 18,
  [BirdSpecies.CHICKEN]: 21,
  [BirdSpecies.DUCK]: 28,
  [BirdSpecies.GOOSE]: 31,
  [BirdSpecies.PEACOCK]: 29,
  [BirdSpecies.TURKEY]: 28,
  [BirdSpecies.PHEASANT]: 25,
  [BirdSpecies.GUINEA_FOWL]: 27,
  [BirdSpecies.CUSTOM]: 21,
};

class IncubatorAPI {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Status endpoints
  async getStatus(): Promise<IncubatorStatus> {
    const response = await axios.get(`${this.baseURL}/api/status`);
    return response.data;
  }

  async getConfig(): Promise<IncubatorConfig> {
    const response = await axios.get(`${this.baseURL}/api/config`);
    return response.data;
  }

  async updateConfig(config: Partial<IncubatorConfig>): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/api/config`, config);
    return response.data;
  }

  // Command endpoints
  async sendCommand(command: string, species?: number): Promise<{ success: boolean; message: string }> {
    const payload: any = { command };
    if (species !== undefined) {
      payload.species = species;
    }
    const response = await axios.post(`${this.baseURL}/api/command`, payload);
    return response.data;
  }

  // Incubation management
  async getIncubationStatus(): Promise<IncubationStatus> {
    const response = await axios.get(`${this.baseURL}/api/incubation`);
    return response.data;
  }

  async startIncubation(species: BirdSpecies, startTime?: number): Promise<{ success: boolean; message: string }> {
    const payload: any = { action: "start", species };
    if (startTime) {
      payload.start_time = startTime;
    }
    const response = await axios.post(`${this.baseURL}/api/incubation`, payload);
    return response.data;
  }

  async stopIncubation(): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/api/incubation`, { action: "stop" });
    return response.data;
  }

  async adjustIncubationDays(days: number): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/api/incubation`, { action: "adjust_days", days });
    return response.data;
  }

  async setIncubationDay(day: number): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/api/incubation`, { action: "set_day", day });
    return response.data;
  }

  // System information
  async getSystemInfo(): Promise<SystemInfo> {
    const response = await axios.get(`${this.baseURL}/api/system`);
    return response.data;
  }

  async getTimeInfo(): Promise<TimeInfo> {
    const response = await axios.get(`${this.baseURL}/api/time`);
    return response.data;
  }

  // Network discovery helper
  static async discoverIncubators(): Promise<string[]> {
    // This would implement network scanning logic
    // For now, return a mock list
    return ["http://incubator-esp32c.local", "http://192.168.1.100"];
  }
}

export default IncubatorAPI;