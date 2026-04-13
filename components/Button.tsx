import React from "react";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { useLanguage } from "../contexts/LanguageContext";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  translateTitle?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  className = "",
  translateTitle = true,
}) => {
  const { t } = useLanguage();
  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-blue-600 active:bg-blue-700";
      case "secondary":
        return "bg-gray-600 active:bg-gray-700";
      case "danger":
        return "bg-red-600 active:bg-red-700";
      case "success":
        return "bg-green-600 active:bg-green-700";
      default:
        return "bg-blue-600 active:bg-blue-700";
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "small":
        return "px-3 py-2";
      case "medium":
        return "px-4 py-3";
      case "large":
        return "px-6 py-4";
      default:
        return "px-4 py-3";
    }
  };

  const getTextSizeClasses = () => {
    switch (size) {
      case "small":
        return "text-sm";
      case "medium":
        return "text-base";
      case "large":
        return "text-lg";
      default:
        return "text-base";
    }
  };

  return (
    <TouchableOpacity
      className={`rounded-lg ${getVariantClasses()} ${getSizeClasses()} ${
        disabled || loading ? "opacity-50" : ""
      } ${className}`}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <Text
          className={`text-white font-semibold text-center ${getTextSizeClasses()}`}
        >
          {translateTitle ? t(title) : title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;