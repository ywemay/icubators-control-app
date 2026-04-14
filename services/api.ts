import axios from "axios";

export interface IncubatorStatus {
  temperature: number;
  humidity: number;
  target_temp: number;
  target_humidity?: number; // Optional, not in the example response
  heater_on: number | boolean; // Can be 1/0 or true/false
  fan_on: boolean;
  light_on?: boolean; // Optional, not in the example response
  egg_turner_active?: boolean; // Legacy field - keep for backward compatibility
  turner_active: boolean;
  turner_turning: boolean;
  time_until_next_turn?: number; // Legacy field - keep for backward compatibility
  next_turn_seconds: number;
  turn_interval: number;
  turn_duration?: number; // New field from response
  current_time?: string; // New field from response
  current_date?: string; // New field from response
  incubation_active: boolean;
  incubator_state: string;
  incubator_state_code: number;
  password_enabled: boolean;
  authenticated: boolean;
  wifi_connected: boolean;
  wifi_ssid?: string; // New field from response
  ip_address: string;
  hostname: string;
  incubator_name?: string; // New field from response - human-defined name!
  uptime: string | number; // Can be string "00:59:23" or number of seconds
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
  elapsed_days?: number; // Legacy field
  remaining_days?: number; // Legacy field
  incubation_day: number; // New field from response
  incubation_remaining_days: number; // New field from response
  is_candling_day: boolean;
  is_lockdown_day: boolean;
  is_hatching_day: boolean;
  time_remaining?: string; // Optional, not in example response
  target_temp?: number; // Optional, might be in status instead
  target_humidity?: number; // Optional, might be in status instead
  incubation_days?: number; // Optional, can be calculated
  candling_day?: number; // Optional
  lockdown_day?: number; // Optional
  turn_interval?: number; // Optional, might be in status instead
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
      target_temp: data.target_temp,
      target_humidity: data.target_humidity || 50, // Default if not provided
      heater_on: data.heater_on,
      fan_on: data.fan_on,
      light_on: data.light_on || false,
      egg_turner_active: data.turner_active || data.egg_turner_active || false,
      turner_active: data.turner_active || false,
      turner_turning: data.turner_turning || false,
      time_until_next_turn: data.next_turn_seconds || data.time_until_next_turn || 0,
      next_turn_seconds: data.next_turn_seconds || 0,
      turn_interval: data.turn_interval || 8 * 60 * 60, // Default 8 hours
      turn_duration: data.turn_duration,
      current_time: data.current_time,
      current_date: data.current_date,
      incubation_active: data.incubation_active || false,
      incubator_state: data.incubator_state || (data.incubation_active ? "incubating" : "idle"),
      incubator_state_code: data.incubator_state_code || (data.incubation_active ? 1 : 0),
      password_enabled: data.password_enabled || false,
      authenticated: data.authenticated || false,
      wifi_connected: data.wifi_connected,
      wifi_ssid: data.wifi_ssid,
      ip_address: data.ip_address,
      hostname: data.hostname,
      incubator_name: data.incubator_name,
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
    try {
      // Try to get from separate incubation endpoint
      const response = await axios.get(`${this.baseURL}/api/incubation`);
      return response.data;
    } catch (error) {
      // If separate endpoint fails, get from status endpoint
      const status = await this.getStatus();
      
      // Extract incubation data from status
      return {
        session_active: status.incubation_active,
        species: (status as any).incubation_species || "",
        incubation_day: (status as any).incubation_day || 0,
        incubation_remaining_days: (status as any).incubation_remaining_days || 0,
        is_candling_day: (status as any).is_candling_day || false,
        is_lockdown_day: (status as any).is_lockdown_day || false,
        is_hatching_day: (status as any).is_hatching_day || false,
        // Calculate elapsed_days and remaining_days for backward compatibility
        elapsed_days: (status as any).incubation_day || 0,
        remaining_days: (status as any).incubation_remaining_days || 0,
      };
    }
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

  // Authentication
  async authenticate(password: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/api/auth`, { password });
    return response.data;
  }

  async getAuthStatus(): Promise<{
    authenticated: boolean;
    password_enabled: boolean;
    requires_password: boolean;
  }> {
    const response = await axios.get(`${this.baseURL}/api/auth`);
    return response.data;
  }

  // Check if authentication is required for an action
  async checkAuthBeforeAction(): Promise<boolean> {
    try {
      const authStatus = await this.getAuthStatus();
      return !authStatus.requires_password; // Returns true if no auth needed
    } catch (error) {
      console.error("Failed to check auth status:", error);
      return true; // Assume no auth needed on error
    }
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