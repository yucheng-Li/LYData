import * as Notifications from "expo-notifications";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";

const EXCHANGE_RATE_TASK = "EXCHANGE_RATE_TASK";
const API_URL = "https://api.exchangerate-api.com/v4/latest/JPY";

// 配置通知
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 定义后台任务
TaskManager.defineTask(EXCHANGE_RATE_TASK, async () => {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    // 获取CNY汇率（因为API返回的是以1日元为基准的其他货币汇率）
    const cnyRate = data.rates.CNY;
    const formattedRate = (1 / cnyRate).toFixed(4); // 转换为1人民币等于多少日元

    // 发送通知
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "日元汇率更新",
        body: `当前汇率: 1 CNY = ${formattedRate} JPY`,
      },
      trigger: null, // 立即发送通知
    });

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("获取汇率失败:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerExchangeRateTask = async () => {
  try {
    // 请求通知权限
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      throw new Error("需要通知权限来发送汇率更新！");
    }

    // 注册后台任务
    await BackgroundFetch.registerTaskAsync(EXCHANGE_RATE_TASK, {
      minimumInterval: 10 * 60, // 10分钟
      stopOnTerminate: false, // 应用关闭后继续运行
      startOnBoot: true, // 设备重启后自动开始
    });

    console.log("汇率更新任务已注册");
  } catch (error) {
    console.error("注册任务失败:", error);
  }
};

export const unregisterExchangeRateTask = async () => {
  try {
    await BackgroundFetch.unregisterTaskAsync(EXCHANGE_RATE_TASK);
    console.log("汇率更新任务已注销");
  } catch (error) {
    console.error("注销任务失败:", error);
  }
};
