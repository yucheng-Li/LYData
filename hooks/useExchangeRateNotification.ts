import { useEffect, useRef, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { Platform, Alert } from "react-native";

// 配置通知行为
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldPresent: true,
  }),
});

interface UseExchangeRateNotificationResult {
  sendNotification: () => Promise<string | undefined>;
  setupNotifications: () => Promise<boolean>;
  notificationPermission: string | null;
}

export function useExchangeRateNotification(): UseExchangeRateNotificationResult {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const permissionRef = useRef<string | null>(null);

  // 设置通知监听器
  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("收到通知:", notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("用户点击了通知:", response);
        // 这里可以添加点击通知后的处理逻辑
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

  // 初始化通知设置
  const setupNotifications = useCallback(async () => {
    try {
      // 配置iOS通知类别
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

      permissionRef.current = finalStatus;
      console.log("通知权限状态:", finalStatus);

      return finalStatus === "granted";
    } catch (error) {
      console.error("设置通知失败:", error);
      return false;
    }
  }, []);

  // 发送汇率通知
  const sendNotification = useCallback(async () => {
    try {
      if (permissionRef.current !== "granted") {
        const granted = await setupNotifications();
        if (!granted) {
          Alert.alert(
            "通知权限未授权",
            "请在设置中开启通知权限以接收汇率更新。"
          );
          return;
        }
      }

      // 获取汇率数据
      const response = await fetch(
        "https://api.exchangerate-api.com/v4/latest/JPY"
      );
      const data = await response.json();

      // 计算汇率
      const cnyRate = data.rates.CNY;
      const formattedRate = (1 / cnyRate).toFixed(4);

      // 通知内容
      const notificationContent = {
        title: "日元汇率更新",
        subtitle: "实时汇率信息",
        body: `当前汇率: 1 CNY = ${formattedRate} JPY`,
        sound: true,
        priority: "max",
        badge: 1,
        data: {
          type: "exchange_rate",
          rate: formattedRate,
          timestamp: new Date().toISOString(),
        },
        categoryIdentifier: "exchange_rate",
      };

      // 发送通知
      const identifier = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null,
      });

      // 发送备份通知
      await Notifications.presentNotificationAsync(notificationContent);

      console.log("通知发送成功，ID:", identifier);
      return identifier;
    } catch (error: any) {
      console.error("发送通知失败:", error);
      throw error;
    }
  }, [setupNotifications]);

  return {
    sendNotification,
    setupNotifications,
    notificationPermission: permissionRef.current,
  };
}
