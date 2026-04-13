import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'incubator_app_settings';

export interface AppSettings {
  language: 'en' | 'zh';
  temperatureUnit: 'celsius' | 'fahrenheit';
  updateInterval: number; // seconds
  autoDiscover: boolean;
  manualIPs: string[]; // List of manual IP addresses
  selectedIncubator?: string; // Currently selected incubator URL
}

const defaultSettings: AppSettings = {
  language: 'en',
  temperatureUnit: 'celsius',
  updateInterval: 5,
  autoDiscover: true,
  manualIPs: ['http://incubator-esp32c.local', 'http://192.168.1.100'],
};

class SettingsService {
  private settings: AppSettings = defaultSettings;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        this.settings = { ...defaultSettings, ...JSON.parse(stored) };
      } else {
        this.settings = { ...defaultSettings };
        await this.save();
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize settings:', error);
      // Use defaults if storage fails
      this.settings = { ...defaultSettings };
      this.initialized = true;
    }
  }

  async getSettings(): Promise<AppSettings> {
    await this.initialize();
    return { ...this.settings };
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    await this.initialize();
    this.settings = { ...this.settings, ...updates };
    await this.save();
  }

  async addManualIP(ip: string): Promise<void> {
    await this.initialize();
    if (!this.settings.manualIPs.includes(ip)) {
      this.settings.manualIPs.push(ip);
      await this.save();
    }
  }

  async removeManualIP(ip: string): Promise<void> {
    await this.initialize();
    this.settings.manualIPs = this.settings.manualIPs.filter(item => item !== ip);
    await this.save();
  }

  async setSelectedIncubator(url: string): Promise<void> {
    await this.initialize();
    this.settings.selectedIncubator = url;
    await this.save();
  }

  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  // Helper to check if AsyncStorage is available
  static async isStorageAvailable(): Promise<boolean> {
    try {
      await AsyncStorage.setItem('@test', 'test');
      await AsyncStorage.removeItem('@test');
      return true;
    } catch (error) {
      console.error('AsyncStorage not available:', error);
      return false;
    }
  }
}

export default new SettingsService();