import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import StatusCard from "../components/StatusCard";
import Button from "../components/Button";
import { useLanguage } from "../contexts/LanguageContext";
import IncubatorAPI, { BirdSpecies, speciesNames } from "../services/api";
import settingsService from "../services/settings";

const DashboardScreen: React.FC = () => {
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [incubationStatus, setIncubationStatus] = useState<any>(null);
  const [selectedIncubator, setSelectedIncubator] = useState<string>("");
  const [manualIPs, setManualIPs] = useState<string[]>([]);
  const [autoDiscover, setAutoDiscover] = useState(true);
  const [temperatureUnit, setTemperatureUnit] = useState<"celsius" | "fahrenheit">("celsius");

  const api = selectedIncubator ? new IncubatorAPI(selectedIncubator) : null;

  useEffect(() => {
    loadSettings();
  }, []);

  // Reload settings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const settings = await settingsService.getSettings();
      setManualIPs(settings.manualIPs);
      setAutoDiscover(settings.autoDiscover);
      setTemperatureUnit(settings.temperatureUnit);
      
      // Set selected incubator
      if (settings.selectedIncubator) {
        setSelectedIncubator(settings.selectedIncubator);
      } else if (settings.manualIPs.length > 0) {
        // Default to first manual IP if available
        setSelectedIncubator(settings.manualIPs[0]);
      } else if (settings.autoDiscover) {
        // Default to auto-discover address
        setSelectedIncubator("http://incubator-esp32c.local");
      }
      // Otherwise, selectedIncubator remains empty
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const fetchData = async () => {
    if (!api) {
      setStatus(null);
      return;
    }
    
    try {
      const [statusData, incubationData] = await Promise.all([
        api.getStatus(),
        api.getIncubationStatus(),
      ]);
      setStatus(statusData);
      setIncubationStatus(incubationData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setStatus(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedIncubator]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleToggleTurn = async () => {
    if (!api) return;
    try {
      if (status?.turner_turning) {
        // If currently turning, stop it
        await api.stopTurning();
      } else {
        // If not turning, start it
        await api.sendCommand("turn_now");
      }
      // Refresh data after command
      await fetchData();
    } catch (error) {
      console.error("Failed to toggle turn:", error);
    }
  };

  const handleStartIncubation = async (species: BirdSpecies) => {
    if (!api) return;
    try {
      await api.startIncubation(species);
      await fetchData();
    } catch (error) {
      console.error("Failed to start incubation:", error);
    }
  };

  const handleSelectIncubator = async (url: string) => {
    setSelectedIncubator(url);
    try {
      await settingsService.setSelectedIncubator(url);
      // Refresh data after selecting new incubator
      await fetchData();
    } catch (error) {
      console.error("Failed to save selected incubator:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Convert temperature based on selected unit
  const convertTemperature = (celsius: number): { value: number; unit: string } => {
    if (temperatureUnit === "fahrenheit") {
      return {
        value: (celsius * 9/5) + 32,
        unit: "°F"
      };
    }
    return {
      value: celsius,
      unit: "°C"
    };
  };

  if (!status) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 p-4">
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900">
              {t("dashboard.title")}
            </Text>
            {manualIPs.length > 0 && (
              <View className="mt-4">
                <Text className="text-gray-700 mb-2">Select Incubator:</Text>
                <View className="flex-row flex-wrap gap-2">
                  {manualIPs.map((ip, index) => (
                    <Button
                      key={index}
                      title={ip.replace('http://', '').split('/')[0]}
                      onPress={() => handleSelectIncubator(ip)}
                      variant={selectedIncubator === ip ? "primary" : "secondary"}
                      size="small"
                      translateTitle={false}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
          
          <View className="flex-1 items-center justify-center">
            <Text className="text-lg text-gray-600">
              {t("errors.connectionFailed")}
            </Text>
            <Text className="text-gray-500 mt-1">
              Trying to connect to: {selectedIncubator}
            </Text>
            <Button
              title="buttons.refresh"
              onPress={onRefresh}
              className="mt-4"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center">
            <Text className="text-2xl font-bold text-gray-900">
              {t("dashboard.title")}
            </Text>
            {manualIPs.length > 1 && (
              <View className="flex-row space-x-2">
                <Text className="text-gray-600">Incubator:</Text>
                <View className="flex-row flex-wrap gap-1">
                  {manualIPs.map((ip, index) => (
                    <Button
                      key={index}
                      title={ip.replace('http://', '').split('/')[0]}
                      onPress={() => handleSelectIncubator(ip)}
                      variant={selectedIncubator === ip ? "primary" : "secondary"}
                      size="small"
                      translateTitle={false}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
          <Text className="text-gray-600 mt-1">
            {status.hostname} • {status.ip_address}
          </Text>
        </View>

        {/* Temperature and Humidity Cards */}
        <View className="flex-row flex-wrap gap-4 mb-6">
          {status && (
            <StatusCard
              title="dashboard.temperature"
              value={convertTemperature(status.temperature).value.toFixed(1)}
              unit={convertTemperature(status.temperature).unit}
              status={
                Math.abs(status.temperature - status.target_temperature) < 0.5
                  ? "good"
                  : "warning"
              }
            />
          )}
          <StatusCard
            title="dashboard.humidity"
            value={status.humidity.toFixed(1)}
            unit="%"
            status={
              Math.abs(status.humidity - status.target_humidity) < 5
                ? "good"
                : "warning"
            }
          />
        </View>

        {/* Device Status */}
        <View className="bg-white rounded-xl p-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            {t("dashboard.status")}
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <View className="flex-row items-center">
              <View
                className={`w-3 h-3 rounded-full mr-2 ${
                  status.heater_on ? "bg-red-500" : "bg-gray-300"
                }`}
              />
              <Text className="text-gray-700">{t("dashboard.heater")}</Text>
            </View>
            <View className="flex-row items-center">
              <View
                className={`w-3 h-3 rounded-full mr-2 ${
                  status.fan_on ? "bg-blue-500" : "bg-gray-300"
                }`}
              />
              <Text className="text-gray-700">{t("dashboard.fan")}</Text>
            </View>
            <View className="flex-row items-center">
              <View
                className={`w-3 h-3 rounded-full mr-2 ${
                  status.turner_turning ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <Text className="text-gray-700">
                {t("dashboard.eggTurner")}
              </Text>
            </View>
          </View>
          {status.next_turn_seconds > 0 && (
            <View className="mt-4">
              <Text className="text-gray-700">
                {t("dashboard.timeUntilNextTurn")}:
              </Text>
              <Text className="text-xl font-bold text-blue-600">
                {formatTime(status.next_turn_seconds)}
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                {t("dashboard.turnInterval")}: {Math.floor(status.turn_interval / 3600)}h
              </Text>
            </View>
          )}
        </View>

        {/* Incubation Status */}
        {incubationStatus?.session_active && (
          <View className="bg-white rounded-xl p-4 mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              {t("dashboard.incubation")}
            </Text>
            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-700">{t("dashboard.species")}</Text>
                <Text className="font-semibold">
                  {t(`species.${incubationStatus.species.toLowerCase()}`)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-700">
                  {t("dashboard.elapsedDays")}
                </Text>
                <Text className="font-semibold">
                  {incubationStatus.elapsed_days}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-700">
                  {t("dashboard.remainingDays")}
                </Text>
                <Text className="font-semibold">
                  {incubationStatus.remaining_days}
                </Text>
              </View>
              {incubationStatus.is_candling_day && (
                <View className="bg-yellow-50 p-3 rounded-lg">
                  <Text className="text-yellow-800 font-semibold">
                    ⚠️ {t("dashboard.candlingDay")}
                  </Text>
                </View>
              )}
              {incubationStatus.is_lockdown_day && (
                <View className="bg-blue-50 p-3 rounded-lg">
                  <Text className="text-blue-800 font-semibold">
                    🔒 {t("dashboard.lockdownDay")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Quick Controls */}
        <View className="bg-white rounded-xl p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            {t("controls.title")}
          </Text>
          <View className="space-y-3">
            <Button
              title={status.turner_turning ? "controls.stopTurning" : "controls.turnEggsNow"}
              onPress={handleToggleTurn}
              variant={status.turner_turning ? "danger" : "primary"}
            />
            <Button
              title="controls.resetTimer"
              onPress={() => api?.sendCommand("reset_timer")}
              variant="secondary"
            />
            <View className="flex-row space-x-3">
              <Button
                title="controls.startIncubation"
                onPress={() => handleStartIncubation(BirdSpecies.CHICKEN)}
                variant="success"
                size="small"
                className="flex-1"
              />
              <Button
                title="controls.stopIncubation"
                onPress={() => api?.stopIncubation()}
                variant="danger"
                size="small"
                className="flex-1"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;