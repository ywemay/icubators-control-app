import axios from "axios";

export interface IncubatorStatus {
  temperature: number;
  humidity: number;
  target_temperature: number;
  target_humidity: number;
  heater_on: boolean;
  fan_on: boolean;
  light_on: boolean;
  egg_turner_active: boolean; // Legacy field - keep for backward compatibility
  turner_turning: boolean; // New field - indicates if motor is currently ON
  time_until_next_turn: number; // Legacy field - keep for backward compatibility
  next_turn_seconds: number; // New field - time until next automatic turn in seconds
  turn_interval: number; // New field - turn interval in seconds
  incubation_active: boolean;
  incubator_state: string; // New field - "idle" or "incubating"
  incubator_state_code: number; // New field - 0 for idle, 1 for incubating
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
    const data = response.data;
    
    // Map API response to our interface
    return {
      temperature: data.temperature,
      humidity: data.humidity,
      target_temperature: data.target_temp || data.target_temperature,
      target_humidity: data.target_humidity || 50, // Default if not provided
      heater_on: data.heater_on,
      fan_on: data.fan_on,
      light_on: data.light_on || false,
      egg_turner_active: data.turner_active || data.egg_turner_active || false,
      turner_turning: data.turner_turning || data.turner_active || false,
      time_until_next_turn: data.next_turn_seconds || data.time_until_next_turn || 0,
      next_turn_seconds: data.next_turn_seconds || 0,
      turn_interval: data.turn_interval || 8 * 60 * 60, // Default 8 hours
      incubation_active: data.incubation_active || false,
      incubator_state: data.incubator_state || (data.incubation_active ? "incubating" : "idle"),
      incubator_state_code: data.incubator_state_code || (data.incubation_active ? 1 : 0),
      wifi_connected: data.wifi_connected,
      ip_address: data.ip_address,
      hostname: data.hostname,
      uptime: data.uptime || 0,
    };
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

  // Stop turning command
  async stopTurning(): Promise<{ success: boolean; message: string }> {
    return this.sendCommand("stop_turning");
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