import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl, Alert, Modal, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import StatusCard from "../components/StatusCard";
import Button from "../components/Button";
import { useLanguage } from "../contexts/LanguageContext";
import { useToast } from "../contexts/ToastContext";
import IncubatorAPI, { BirdSpecies, speciesNames } from "../services/api";
import settingsService from "../services/settings";

// Define route params type
type DashboardScreenRouteProp = RouteProp<
  { Dashboard: { incubatorId: string } },
  'Dashboard'
>;

const DashboardScreen: React.FC = () => {
  const route = useRoute<DashboardScreenRouteProp>();
  const { incubatorId } = route.params || {};
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [incubationStatus, setIncubationStatus] = useState<any>(null);
  const [selectedIncubator, setSelectedIncubator] = useState<string>(incubatorId || "");
  const [manualIPs, setManualIPs] = useState<string[]>([]);
  const [autoDiscover, setAutoDiscover] = useState(true);
  const [temperatureUnit, setTemperatureUnit] = useState<"celsius" | "fahrenheit">("celsius");
  const [selectedSpecies, setSelectedSpecies] = useState<BirdSpecies>(BirdSpecies.CHICKEN);
  
  // Password authentication state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [pendingAction, setPendingAction] = useState<{
    type: string;
    handler: () => Promise<void>;
    title: string;
    message: string;
  } | null>(null);

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
      
      // Use the incubatorId from route params if available
      // Otherwise fall back to saved settings
      if (!selectedIncubator && incubatorId) {
        setSelectedIncubator(incubatorId);
      } else if (!selectedIncubator && settings.selectedIncubator) {
        setSelectedIncubator(settings.selectedIncubator);
      } else if (!selectedIncubator && settings.manualIPs.length > 0) {
        // Default to first manual IP if available
        setSelectedIncubator(settings.manualIPs[0]);
      } else if (!selectedIncubator && settings.autoDiscover) {
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
    } catch (error: any) {
      console.error("Failed to fetch data:", error);
      setStatus(null);
      
      // Show toast for network errors
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        showToast("Cannot connect to incubator. Please check network connection.", 'error');
      } else {
        showToast("Failed to fetch incubator data.", 'error');
      }
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up automatic refresh every 5 seconds
    const intervalId = setInterval(() => {
      if (selectedIncubator) {
        fetchData();
      }
    }, 5000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [selectedIncubator]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleToggleTurn = async () => {
    if (!api) return;
    
    const isTurning = status?.turner_turning;
    const title = isTurning ? "Stop Turning" : "Turn Eggs Now";
    const message = isTurning 
      ? "Are you sure you want to stop turning?"
      : "Are you sure you want to start turning eggs now?";
    
    const actionHandler = async () => {
      try {
        if (isTurning) {
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
        Alert.alert("Error", "Failed to toggle turn");
      }
    };
    
    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: isTurning ? "Stop" : "Start", 
          style: isTurning ? "destructive" : "default",
          onPress: () => {
            checkAuthAndExecute(
              isTurning ? "stop_turning" : "turn_now",
              title,
              message,
              actionHandler
            );
          }
        }
      ]
    );
  };

  const handleStartIncubation = async () => {
    if (!api) return;
    
    const speciesName = speciesNames[selectedSpecies];
    
    const actionHandler = async () => {
      try {
        await api.startIncubation(selectedSpecies);
        await fetchData();
      } catch (error) {
        console.error("Failed to start incubation:", error);
        Alert.alert("Error", "Failed to start incubation");
      }
    };
    
    Alert.alert(
      "Start Incubation",
      `Are you sure you want to start incubation for ${speciesName}?\n\nThis will:\n• Set target temperature based on species\n• Set turn interval based on species\n• Start incubation tracking`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Start", 
          style: "default",
          onPress: () => {
            checkAuthAndExecute(
              "start_incubation",
              "Start Incubation",
              `Starting incubation for ${speciesName}`,
              actionHandler
            );
          }
        }
      ]
    );
  };

  // Password authentication helpers
  const checkAuthAndExecute = async (
    actionType: string,
    actionTitle: string,
    actionMessage: string,
    actionHandler: () => Promise<void>
  ) => {
    if (!api) return;
    
    try {
      const authStatus = await api.getAuthStatus();
      
      if (authStatus.requires_password) {
        // Show password modal
        setPendingAction({
          type: actionType,
          handler: actionHandler,
          title: actionTitle,
          message: actionMessage
        });
        setShowPasswordModal(true);
        setPassword("");
        setPasswordError("");
      } else {
        // Already authenticated or no password required
        await actionHandler();
      }
    } catch (error) {
      console.error("Failed to check auth status:", error);
      // Try to execute anyway
      await actionHandler();
    }
  };
  
  const handlePasswordSubmit = async () => {
    if (!api || !pendingAction) return;
    
    try {
      const result = await api.authenticate(password);
      
      if (result.success) {
        setShowPasswordModal(false);
        setPassword("");
        setPasswordError("");
        
        // Execute the pending action
        await pendingAction.handler();
        setPendingAction(null);
      } else {
        setPasswordError("Incorrect password. Please try again.");
        setPassword("");
      }
    } catch (error) {
      console.error("Password authentication error:", error);
      setPasswordError("Network error. Please try again.");
    }
  };
  
  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setPassword("");
    setPasswordError("");
    setPendingAction(null);
  };
  
  const handleStopIncubation = async () => {
    if (!api) return;
    
    const actionHandler = async () => {
      try {
        await api.stopIncubation();
        await fetchData();
      } catch (error) {
        console.error("Failed to stop incubation:", error);
        Alert.alert("Error", "Failed to stop incubation");
      }
    };
    
    Alert.alert(
      "Stop Incubation",
      "Are you sure you want to stop the current incubation session?\n\nThis will:\n• Reset to default temperature (38.0°C)\n• Reset to default turn interval (8 hours)\n• Clear incubation tracking data",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Stop", 
          style: "destructive",
          onPress: () => {
            checkAuthAndExecute(
              "stop_incubation",
              "Stop Incubation",
              "Stopping incubation session",
              actionHandler
            );
          }
        }
      ]
    );
  };



  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatUptime = (seconds: number | undefined) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) {
      return "--";
    }
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
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
            <Text className="text-gray-600 mt-1">
              {selectedIncubator?.replace('http://', '').replace('https://', '')}
            </Text>
          </View>
          
          <View className="flex-1 items-center justify-center">
            <View className="items-center">
              <ActivityIndicator size="large" color="#3b82f6" className="mb-4" />
              <Text className="text-gray-600 text-lg font-medium">
                Connecting to incubator...
              </Text>
              <Text className="text-gray-500 mt-2 text-center">
                Please wait while we establish connection
              </Text>
            </View>
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
            <View className="flex-row items-center space-x-2">
              {/* Security Status */}
              {status && (
                <View className="px-3 py-1 rounded-full flex-row items-center" 
                      style={{
                        backgroundColor: status.password_enabled 
                          ? (status.authenticated ? '#d1fae5' : '#fef3c7')
                          : '#fee2e2'
                      }}
                >
                  <View className="w-2 h-2 rounded-full mr-2" 
                        style={{
                          backgroundColor: status.password_enabled 
                            ? (status.authenticated ? '#10b981' : '#f59e0b')
                            : '#ef4444'
                        }}
                  />
                  <Text className="text-sm font-medium" 
                        style={{
                          color: status.password_enabled 
                            ? (status.authenticated ? '#065f46' : '#92400e')
                            : '#7f1d1d'
                        }}
                  >
                    {status.password_enabled 
                      ? (status.authenticated ? 'AUTHENTICATED' : 'LOCKED')
                      : 'NO PASSWORD'}
                  </Text>
                </View>
              )}
              
            </View>

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
              targetValue={convertTemperature(status.target_temperature).value.toFixed(1)}
              targetLabel={t("dashboard.target")}
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
            targetValue={status.target_humidity.toFixed(1)}
            targetLabel={t("dashboard.target")}
          />
        </View>

        {/* Additional Status Cards */}
        <View className="flex-row flex-wrap gap-4 mb-6">
          <StatusCard
            title="dashboard.systemUptime"
            value={formatUptime(status.uptime)}
            status="neutral"
          />
          <StatusCard
            title="dashboard.wifiStatus"
            value={status.wifi_connected ? t("dashboard.connected") : t("dashboard.disconnected")}
            status={status.wifi_connected ? "good" : "danger"}
          />
          <StatusCard
            title="dashboard.incubatorState"
            value={status.incubator_state === "incubating" ? t("dashboard.incubating") : t("dashboard.idle")}
            status={status.incubator_state === "incubating" ? "good" : "neutral"}
          />
          <StatusCard
            title="dashboard.turnInterval"
            value={Math.floor(status.turn_interval / 3600)}
            unit="h"
            status="neutral"
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
            {status.light_on !== undefined && (
              <View className="flex-row items-center">
                <View
                  className={`w-3 h-3 rounded-full mr-2 ${
                    status.light_on ? "bg-yellow-500" : "bg-gray-300"
                  }`}
                />
                <Text className="text-gray-700">
                  {t("dashboard.light")}
                </Text>
              </View>
            )}
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
            
            {/* Incubation Progress Bar */}
            <View className="mb-6">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-700 font-medium">
                  Day {incubationStatus.elapsed_days} of {incubationStatus.elapsed_days + incubationStatus.remaining_days}
                </Text>
                <Text className="text-gray-700 font-medium">
                  {Math.round((incubationStatus.elapsed_days / (incubationStatus.elapsed_days + incubationStatus.remaining_days)) * 100)}%
                </Text>
              </View>
              <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <View 
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${(incubationStatus.elapsed_days / (incubationStatus.elapsed_days + incubationStatus.remaining_days)) * 100}%`
                  }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-xs text-gray-500">Start</Text>
                <Text className="text-xs text-gray-500">Hatch</Text>
              </View>
            </View>
            
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
              onPress={() => {
                Alert.alert(
                  "Reset Timer",
                  "Are you sure you want to reset the egg turner timer?\n\nThis will reset the countdown to the next automatic turn.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: "Reset", 
                      style: "default",
                      onPress: async () => {
                        try {
                          await api?.sendCommand("reset_timer");
                          await fetchData();
                        } catch (error) {
                          console.error("Failed to reset timer:", error);
                          Alert.alert("Error", "Failed to reset timer");
                        }
                      }
                    }
                  ]
                );
              }}
              variant="secondary"
            />
            {/* Incubation Controls - Show/hide based on state */}
            {status?.incubator_state === "idle" && !status?.incubation_active ? (
              <View className="space-y-3">
                <Text className="text-gray-700 font-medium mb-2">Select Species:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                  <View className="flex-row space-x-2">
                    {Object.entries(speciesNames).map(([key, name]) => {
                      const speciesValue = parseInt(key) as BirdSpecies;
                      const isSelected = selectedSpecies === speciesValue;
                      return (
                        <Button
                          key={key}
                          title={name}
                          onPress={() => setSelectedSpecies(speciesValue)}
                          variant={isSelected ? "primary" : "secondary"}
                          size="small"
                          translateTitle={false}
                        />
                      );
                    })}
                  </View>
                </ScrollView>
                <Button
                  title="controls.startIncubation"
                  onPress={handleStartIncubation}
                  variant="success"
                />
              </View>
            ) : (
              <Button
                title="controls.stopIncubation"
                onPress={handleStopIncubation}
                variant="danger"
              />
            )}
          </View>
        </View>
      </ScrollView>
      
      {/* Password Authentication Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handlePasswordCancel}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-xl p-6 w-full max-w-md">
            <Text className="text-xl font-bold text-gray-900 mb-2">
              {pendingAction?.title || "Authentication Required"}
            </Text>
            <Text className="text-gray-600 mb-4">
              {pendingAction?.message || "This operation requires authentication. Please enter your password:"}
            </Text>
            
            {passwordError ? (
              <Text className="text-red-500 mb-2">{passwordError}</Text>
            ) : null}
            
            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-4"
              placeholder="Enter password"
              secureTextEntry={true}
              value={password}
              onChangeText={setPassword}
              autoFocus={true}
              onSubmitEditing={handlePasswordSubmit}
            />
            
            <View className="flex-row justify-end space-x-3">
              <Button
                title="Cancel"
                onPress={handlePasswordCancel}
                variant="secondary"
                size="small"
                translateTitle={false}
              />
              <Button
                title="Authenticate"
                onPress={handlePasswordSubmit}
                variant="primary"
                size="small"
                translateTitle={false}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default DashboardScreen;