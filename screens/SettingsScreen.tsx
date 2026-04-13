import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Switch, TextInput, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Button from "../components/Button";
import { useLanguage } from "../contexts/LanguageContext";
import { Language } from "../services/i18n";
import settingsService, { AppSettings } from "../services/settings";

const SettingsScreen: React.FC = () => {
  const { language: currentLanguage, setLanguage, t } = useLanguage();
  const [language, setLanguageState] = useState<Language>(currentLanguage);
  const [temperatureUnit, setTemperatureUnit] = useState<"celsius" | "fahrenheit">("celsius");
  const [updateInterval, setUpdateInterval] = useState("5");
  const [autoDiscover, setAutoDiscover] = useState(true);
  const [manualIP, setManualIP] = useState("");
  const [manualIPs, setManualIPs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const availableLanguages = [
    { code: "en" as Language, name: t("app.english") },
    { code: "zh" as Language, name: t("app.chinese") },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  // Reload settings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  // Debug: log temperature unit changes
  useEffect(() => {
    console.log("Temperature unit state changed to:", temperatureUnit);
  }, [temperatureUnit]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await settingsService.getSettings();
      console.log("Loaded settings:", {
        temperatureUnit: settings.temperatureUnit,
        language: settings.language,
        updateInterval: settings.updateInterval,
        autoDiscover: settings.autoDiscover,
        manualIPs: settings.manualIPs
      });
      
      setLanguageState(settings.language);
      setTemperatureUnit(settings.temperatureUnit);
      setUpdateInterval(settings.updateInterval.toString());
      setAutoDiscover(settings.autoDiscover);
      setManualIPs(settings.manualIPs);
    } catch (error) {
      console.error("Failed to load settings:", error);
      Alert.alert(t("errors.connectionFailed"), t("errors.connectionFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save language when changed
  const handleLanguageChange = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await setLanguage(lang);
      await settingsService.updateSettings({ language: lang });
    } catch (error) {
      console.error("Failed to save language:", error);
      Alert.alert(t("errors.connectionFailed"), t("errors.connectionFailed"));
    }
  };

  // Auto-save temperature unit when changed
  const handleTemperatureUnitChange = async (unit: "celsius" | "fahrenheit") => {
    console.log("Changing temperature unit to:", unit);
    setTemperatureUnit(unit);
    try {
      await settingsService.updateSettings({ temperatureUnit: unit });
      console.log("Temperature unit saved successfully:", unit);
    } catch (error) {
      console.error("Failed to save temperature unit:", error);
      Alert.alert(t("errors.connectionFailed"), t("errors.connectionFailed"));
      // Revert on error
      loadSettings();
    }
  };

  // Auto-save update interval when changed (with debounce)
  const handleUpdateIntervalChange = async (interval: string) => {
    setUpdateInterval(interval);
    const numInterval = parseInt(interval) || 5;
    if (numInterval >= 1 && numInterval <= 60) {
      try {
        await settingsService.updateSettings({ updateInterval: numInterval });
      } catch (error) {
        console.error("Failed to save update interval:", error);
      }
    }
  };

  // Auto-save autoDiscover when changed
  const handleAutoDiscoverChange = async (value: boolean) => {
    setAutoDiscover(value);
    try {
      await settingsService.updateSettings({ autoDiscover: value });
    } catch (error) {
      console.error("Failed to save autoDiscover:", error);
      Alert.alert(t("errors.connectionFailed"), t("errors.connectionFailed"));
    }
  };

  // Auto-save manual IPs when changed
  const handleAddManualIP = async () => {
    if (manualIP.trim() && !manualIPs.includes(manualIP.trim())) {
      const newIPs = [...manualIPs, manualIP.trim()];
      setManualIPs(newIPs);
      setManualIP("");
      try {
        await settingsService.updateSettings({ manualIPs: newIPs });
      } catch (error) {
        console.error("Failed to save manual IPs:", error);
        Alert.alert(t("errors.connectionFailed"), t("errors.connectionFailed"));
      }
    }
  };

  const handleRemoveManualIP = async (ip: string) => {
    const newIPs = manualIPs.filter(item => item !== ip);
    setManualIPs(newIPs);
    try {
      await settingsService.updateSettings({ manualIPs: newIPs });
    } catch (error) {
      console.error("Failed to save manual IPs:", error);
      Alert.alert(t("errors.connectionFailed"), t("errors.connectionFailed"));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600">Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900">
            {t("settings.title")}
          </Text>
        </View>

        {/* Language Settings */}
        <View className="bg-white rounded-xl p-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            {t("settings.language")}
          </Text>
          <View className="space-y-3">
            {availableLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                className={`flex-row items-center justify-between p-3 rounded-lg ${
                  language === lang.code ? "bg-blue-50" : "bg-gray-50"
                }`}
                onPress={() => handleLanguageChange(lang.code)}
                activeOpacity={0.7}
              >
                <Text className="text-gray-800">{lang.name}</Text>
                <View
                  className={`w-6 h-6 rounded-full border-2 ${
                    language === lang.code
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-300"
                  }`}
                >
                  {language === lang.code && (
                    <View className="w-3 h-3 bg-white rounded-full m-auto" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Temperature Unit */}
        <View className="bg-white rounded-xl p-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            {t("settings.temperatureUnit")}
          </Text>
          <View className="flex-row space-x-4">
            <TouchableOpacity
              className={`flex-1 p-4 rounded-lg border-2 ${
                temperatureUnit === "celsius"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200"
              }`}
              onPress={() => handleTemperatureUnitChange("celsius")}
              activeOpacity={0.7}
            >
              <Text
                className={`text-center text-lg font-semibold ${
                  temperatureUnit === "celsius"
                    ? "text-blue-700"
                    : "text-gray-700"
                }`}
              >
                °C
              </Text>
              <Text className="text-center text-gray-600 mt-1">
                {t("settings.celsius")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 p-4 rounded-lg border-2 ${
                temperatureUnit === "fahrenheit"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200"
              }`}
              onPress={() => handleTemperatureUnitChange("fahrenheit")}
              activeOpacity={0.7}
            >
              <Text
                className={`text-center text-lg font-semibold ${
                  temperatureUnit === "fahrenheit"
                    ? "text-blue-700"
                    : "text-gray-700"
                }`}
              >
                °F
              </Text>
              <Text className="text-center text-gray-600 mt-1">
                {t("settings.fahrenheit")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Update Interval */}
        <View className="bg-white rounded-xl p-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            {t("settings.updateInterval")}
          </Text>
          <View className="flex-row items-center space-x-3">
            <TextInput
              className="border border-gray-300 rounded-lg p-3 text-gray-900 w-20 text-center"
              value={updateInterval}
              onChangeText={handleUpdateIntervalChange}
              keyboardType="numeric"
              placeholder="5"
            />
            <Text className="text-gray-700">{t("settings.seconds")}</Text>
          </View>
          <Text className="text-gray-500 text-sm mt-2">
            How often to update incubator status (1-60 seconds)
          </Text>
        </View>

        {/* Network Discovery */}
        <View className="bg-white rounded-xl p-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            {t("settings.networkDiscovery")}
          </Text>
          
          <View className="space-y-4">
            {/* Auto Discover Toggle */}
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-800">
                {t("settings.autoDiscover")}
              </Text>
              <Switch
                value={autoDiscover}
                onValueChange={handleAutoDiscoverChange}
                trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
                thumbColor="#ffffff"
              />
            </View>
            
            {/* Manual IP Management */}
            <View className="space-y-3">
              <Text className="text-gray-700 font-medium">
                Manual IP Addresses:
              </Text>
              
              {/* Add new IP */}
              <View className="flex-row space-x-2">
                <TextInput
                  className="flex-1 border border-gray-300 rounded-lg p-3 text-gray-900"
                  value={manualIP}
                  onChangeText={setManualIP}
                  placeholder="http://192.168.1.100"
                  keyboardType="url"
                />
                <Button
                  title="buttons.add"
                  onPress={handleAddManualIP}
                  variant="primary"
                  size="small"
                  disabled={!manualIP.trim()}
                />
              </View>
              
              {/* List of saved IPs */}
              {manualIPs.length > 0 && (
                <View className="space-y-2">
                  {manualIPs.map((ip, index) => (
                    <View
                      key={index}
                      className="flex-row items-center justify-between bg-gray-50 p-3 rounded-lg"
                    >
                      <Text className="text-gray-800">{ip}</Text>
                      <Button
                        title="buttons.remove"
                        onPress={() => handleRemoveManualIP(ip)}
                        variant="danger"
                        size="small"
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;