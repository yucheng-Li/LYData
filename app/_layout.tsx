import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import "react-native-reanimated";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { useColorScheme } from "@/hooks/useColorScheme";
import { registerExchangeRateTask } from "@/services/ExchangeRateService";
import { useExchangeRateNotification } from "@/hooks/useExchangeRateNotification";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// 配置通知行为
Notifications.setNotificationHandler({
  handleNotification: async () => {
    console.log("正在处理通知...");
    return {
      shouldShowAlert: true, // 在前台也显示通知
      shouldPlaySound: true, // 播放声音
      shouldSetBadge: true, // 显示角标
      shouldPresent: true, // iOS: 在前台也显示通知
    };
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  const { sendNotification, setupNotifications, notificationPermission } =
    useExchangeRateNotification();

  useEffect(() => {
    // 监听通知接收
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("收到通知:", notification);
      });

    // 监听通知响应（用户点击通知）
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("用户点击了通知:", response);
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // 初始化通知设置
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        // 配置iOS通知设置
        if (Platform.OS === "ios") {
          await Notifications.setNotificationCategoryAsync("exchange_rate", [
            {
              identifier: "view",
              buttonTitle: "查看详情",
              options: {
                opensAppToForeground: true,
              },
            },
          ]);
        }

        // 请求通知权限
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
              allowAnnouncements: true,
              allowDisplayInCarPlay: true,
              allowCriticalAlerts: true,
              provideAppNotificationSettings: true,
              allowProvisional: true,
            },
          });
          finalStatus = status;
        }
        console.log("通知权限状态:", finalStatus);

        if (finalStatus === "granted") {
          // 注册汇率更新任务
          await registerExchangeRateTask();
        }
      } catch (error) {
        console.error("设置通知失败:", error);
      }
    };

    setupNotifications();
  }, []);

  const handleNotification = async () => {
    try {
      await sendNotification();
      // 处理成功情况
    } catch (error) {
      // 处理错误情况
    }
  };

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
