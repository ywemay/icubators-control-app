import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, NavigationProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../contexts/LanguageContext";
import IncubatorAPI, { BirdSpecies, speciesNames } from "../services/api";
import settingsService from "../services/settings";

// Define navigation prop type
type RootStackParamList = {
  IncubatorsList: undefined;
  Dashboard: { incubatorId: string };
  Settings: undefined;
};

type IncubatorsListScreenNavigationProp = NavigationProp<RootStackParamList, 'IncubatorsList'>;

// Define interface for incubator list item
interface IncubatorListItem {
  id: string;
  name: string;
  ipAddress: string;
  hostname: string;
  temperature: number | null;
  humidity: number | null;
  species: string | null;
  speciesName: string;
  incubationActive: boolean;
  elapsedDays: number | null;
  remainingDays: number | null;
  online: boolean;
  lastSeen: Date;
}

const IncubatorsListScreen: React.FC = () => {
  const { t } = useLanguage();
  const navigation = useNavigation<IncubatorsListScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [incubators, setIncubators] = useState<IncubatorListItem[]>([]);
  const [manualIPs, setManualIPs] = useState<string[]>([]);
  const [autoDiscover, setAutoDiscover] = useState(true);

  // Helper function to get species name from species string
  const getSpeciesName = (speciesString: string | null): string => {
    if (!speciesString) return "Unknown";
    
    try {
      // Try to parse as number (0-8)
      const speciesNum = parseInt(speciesString, 10);
      if (!isNaN(speciesNum) && speciesNum >= 0 && speciesNum <= 8) {
        return speciesNames[speciesNum as BirdSpecies] || "Unknown";
      }
      
      // If not a number, try to match by string
      const lowerSpecies = speciesString.toLowerCase();
      for (const [key, name] of Object.entries(speciesNames)) {
        if (name.toLowerCase() === lowerSpecies) {
          return name;
        }
      }
    } catch (error) {
      console.error("Error parsing species:", error);
    }
    
    return "Unknown";
  };

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Reload settings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSettingsAndRefresh();
    }, [])
  );

  const loadSettingsAndRefresh = async () => {
    try {
      const settings = await settingsService.getSettings();
      console.log('Loaded settings:', {
        manualIPs: settings.manualIPs,
        autoDiscover: settings.autoDiscover,
        manualIPsCount: settings.manualIPs.length
      });
      setManualIPs(settings.manualIPs);
      setAutoDiscover(settings.autoDiscover);
      await refreshIncubators(settings.manualIPs, settings.autoDiscover);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await settingsService.getSettings();
      setManualIPs(settings.manualIPs);
      setAutoDiscover(settings.autoDiscover);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const refreshIncubators = async (manualIPsToCheck: string[] = manualIPs, autoDiscoverToCheck: boolean = autoDiscover) => {
    setRefreshing(true);
    
    const discoveredIncubators: IncubatorListItem[] = [];
    
    console.log('Refreshing incubators with:', {
      manualIPsToCheck,
      autoDiscoverToCheck,
      manualIPsToCheckCount: manualIPsToCheck.length
    });
    
    try {
      // Check auto-discover address if enabled
      if (autoDiscoverToCheck) {
        const autoDiscoverAddress = "http://incubator-esp32c.local";
        try {
          const api = new IncubatorAPI(autoDiscoverAddress);
          const status = await api.getStatus();
          const incubationStatus = await api.getIncubationStatus();
          
          discoveredIncubators.push({
            id: autoDiscoverAddress,
            name: status.hostname || "Auto-discovered Incubator",
            ipAddress: status.ip_address || autoDiscoverAddress,
            hostname: status.hostname || "incubator-esp32c",
            temperature: status.temperature,
            humidity: status.humidity,
            species: incubationStatus.species,
            speciesName: getSpeciesName(incubationStatus.species),
            incubationActive: incubationStatus.session_active,
            elapsedDays: incubationStatus.elapsed_days,
            remainingDays: incubationStatus.remaining_days,
            online: true,
            lastSeen: new Date(),
          });
        } catch (error) {
          console.log(`Auto-discover failed for ${autoDiscoverAddress}:`, error);
        }
      }
      
      // Check manual IPs
      for (const ip of manualIPsToCheck) {
        try {
          const api = new IncubatorAPI(ip);
          const status = await api.getStatus();
          const incubationStatus = await api.getIncubationStatus();
          
          discoveredIncubators.push({
            id: ip,
            name: status.hostname || `Incubator at ${ip}`,
            ipAddress: status.ip_address || ip,
            hostname: status.hostname || ip,
            temperature: status.temperature,
            humidity: status.humidity,
            species: incubationStatus.species,
            speciesName: getSpeciesName(incubationStatus.species),
            incubationActive: incubationStatus.session_active,
            elapsedDays: incubationStatus.elapsed_days,
            remainingDays: incubationStatus.remaining_days,
            online: true,
            lastSeen: new Date(),
          });
        } catch (error) {
          console.log(`Failed to connect to ${ip}:`, error);
          // Add offline incubator
          discoveredIncubators.push({
            id: ip,
            name: `Incubator at ${ip}`,
            ipAddress: ip,
            hostname: ip,
            temperature: null,
            humidity: null,
            species: null,
            speciesName: "Offline",
            incubationActive: false,
            elapsedDays: null,
            remainingDays: null,
            online: false,
            lastSeen: new Date(),
          });
        }
      }
      
      setIncubators(discoveredIncubators);
    } catch (error) {
      console.error("Failed to refresh incubators:", error);
      Alert.alert(t("common.error"), t("dashboard.failedToRefresh"));
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectIncubator = (incubator: IncubatorListItem) => {
    // Save selected incubator to settings
    settingsService.setSelectedIncubator(incubator.id);
    
    // Navigate to dashboard with incubator details
    navigation.navigate("Dashboard", { incubatorId: incubator.id });
  };

  const handleAddIncubator = () => {
    navigation.navigate("Settings");
  };

  const formatTemperature = (temp: number | null) => {
    if (temp === null) return "--";
    return `${temp.toFixed(1)}°C`;
  };

  const formatHumidity = (humidity: number | null) => {
    if (humidity === null) return "--";
    return `${humidity.toFixed(0)}%`;
  };

  const getStatusColor = (online: boolean, incubationActive: boolean) => {
    if (!online) return "#ef4444"; // red for offline
    if (incubationActive) return "#10b981"; // green for active incubation
    return "#3b82f6"; // blue for online but not incubating
  };

  const getStatusText = (online: boolean, incubationActive: boolean) => {
    if (!online) return t("incubators.offline");
    if (incubationActive) return t("incubators.incubating");
    return t("incubators.idle");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("incubators.title")}</Text>
        <TouchableOpacity onPress={handleAddIncubator} style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={28} color="#3b82f6" />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshIncubators} />
        }
      >
        {incubators.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="egg-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>{t("incubators.noIncubators")}</Text>
            <Text style={styles.emptyStateText}>{t("incubators.addFirstIncubator")}</Text>
            <TouchableOpacity onPress={handleAddIncubator} style={styles.emptyStateButton}>
              <Text style={styles.emptyStateButtonText}>{t("incubators.addIncubator")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          incubators.map((incubator) => (
            <TouchableOpacity
              key={incubator.id}
              style={styles.incubatorCard}
              onPress={() => handleSelectIncubator(incubator)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.nameContainer}>
                  <Text style={styles.incubatorName} numberOfLines={1}>
                    {incubator.name}
                  </Text>
                  <Text style={styles.incubatorHostname} numberOfLines={1}>
                    {incubator.hostname}
                  </Text>
                </View>
                <View style={styles.statusIndicator}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(incubator.online, incubator.incubationActive) },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {getStatusText(incubator.online, incubator.incubationActive)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.cardContent}>
                <View style={styles.metricRow}>
                  <View style={styles.metric}>
                    <Ionicons name="thermometer-outline" size={20} color="#6b7280" />
                    <Text style={styles.metricLabel}>{t("dashboard.temperature")}</Text>
                    <Text style={styles.metricValue}>
                      {formatTemperature(incubator.temperature)}
                    </Text>
                  </View>
                  
                  <View style={styles.metric}>
                    <Ionicons name="water-outline" size={20} color="#6b7280" />
                    <Text style={styles.metricLabel}>{t("dashboard.humidity")}</Text>
                    <Text style={styles.metricValue}>
                      {formatHumidity(incubator.humidity)}
                    </Text>
                  </View>
                  
                  <View style={styles.metric}>
                    <Ionicons name="egg-outline" size={20} color="#6b7280" />
                    <Text style={styles.metricLabel}>{t("dashboard.species")}</Text>
                    <Text style={styles.metricValue} numberOfLines={1}>
                      {incubator.speciesName}
                    </Text>
                  </View>
                </View>
                
                {incubator.incubationActive && incubator.elapsedDays !== null && incubator.remainingDays !== null && (
                  <View style={styles.incubationProgress}>
                    <Text style={styles.progressText}>
                      {t("dashboard.day")} {incubator.elapsedDays} / {incubator.elapsedDays + incubator.remainingDays}
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${(incubator.elapsedDays / (incubator.elapsedDays + incubator.remainingDays)) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
              
              <View style={styles.cardFooter}>
                <Text style={styles.ipAddress}>{incubator.ipAddress}</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  addButton: {
    padding: 4,
  },
  listContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  incubatorCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  nameContainer: {
    flex: 1,
    marginRight: 12,
  },
  incubatorName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  incubatorHostname: {
    fontSize: 14,
    color: "#6b7280",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  cardContent: {
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  metric: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  incubationProgress: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10b981",
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  ipAddress: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: "monospace",
  },
});

export default IncubatorsListScreen;