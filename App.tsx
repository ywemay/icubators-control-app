import "./global.css";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import IncubatorsListScreen from "./screens/IncubatorsListScreen";
import DashboardScreen from "./screens/DashboardScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";

// Define the stack param list
type RootStackParamList = {
  IncubatorsList: undefined;
  Dashboard: { incubatorId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Define navigation prop type for screens
type DashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

function AppContent() {
  const { t } = useLanguage();
  
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="IncubatorsList"
        screenOptions={{
          headerStyle: {
            backgroundColor: "#ffffff",
          },
          headerTintColor: "#111827",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        <Stack.Screen
          name="IncubatorsList"
          component={IncubatorsListScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={({ navigation }: { navigation: DashboardScreenNavigationProp }) => ({
            title: t("app.title"),
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ marginLeft: 8, padding: 8 }}
              >
                <Ionicons name="arrow-back" size={24} color="#3b82f6" />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate("Settings")}
                style={{ marginRight: 8, padding: 8 }}
              >
                <Ionicons name="settings-outline" size={24} color="#3b82f6" />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={({ navigation }: { navigation: SettingsScreenNavigationProp }) => ({
            title: t("app.settings"),
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ marginLeft: 8, padding: 8 }}
              >
                <Ionicons name="arrow-back" size={24} color="#3b82f6" />
              </TouchableOpacity>
            ),
          })}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}