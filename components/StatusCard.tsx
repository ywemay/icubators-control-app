import React from "react";
import { View, Text } from "react-native";
import { useLanguage } from "../contexts/LanguageContext";

interface StatusCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: "good" | "warning" | "danger" | "neutral";
  icon?: React.ReactNode;
  targetValue?: string | number;
  targetLabel?: string;
}

const StatusCard: React.FC<StatusCardProps> = ({
  title,
  value,
  unit = "",
  status = "neutral",
  icon,
  targetValue,
  targetLabel = "Target",
}) => {
  const { t } = useLanguage();
  const getStatusColor = () => {
    switch (status) {
      case "good":
        return "bg-green-100 border-green-300";
      case "warning":
        return "bg-yellow-100 border-yellow-300";
      case "danger":
        return "bg-red-100 border-red-300";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  const getTextColor = () => {
    switch (status) {
      case "good":
        return "text-green-800";
      case "warning":
        return "text-yellow-800";
      case "danger":
        return "text-red-800";
      default:
        return "text-gray-800";
    }
  };

  return (
    <View
      className={`rounded-xl border p-4 ${getStatusColor()} min-w-[150px]`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className={`text-sm font-medium ${getTextColor()}`}>
          {t(title)}
        </Text>
        {icon && <View>{icon}</View>}
      </View>
      <View className="flex-row items-baseline">
        <Text className={`text-2xl font-bold ${getTextColor()}`}>
          {value}
        </Text>
        {unit && (
          <Text className={`text-sm ml-1 ${getTextColor()}`}>
            {unit}
          </Text>
        )}
      </View>
      {targetValue !== undefined && (
        <View className="mt-2 pt-2 border-t border-gray-300 border-opacity-50">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-gray-600">
              {targetLabel}:
            </Text>
            <Text className="text-sm font-medium text-gray-800">
              {targetValue}{unit}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default StatusCard;