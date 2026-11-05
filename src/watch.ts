// Free replacement for Arlo's paid cloud event history + motion alerts.
// While the app is open, poll the camera list; when Arlo uploads a new
// "last image" (it does this on motion/sound events), save it to the phone
// and fire a local notification.
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Device } from './arlo/types';
import { saveImage } from './storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function askNotifyPermission() {
  const r = await Notifications.requestPermissionsAsync();
  return r.granted;
}

const last = new Map<string, number>();

export async function processEvents(devices: Device[]) {
  for (const d of devices) {
    const ts = d.properties?.lastImageUploaded;
    const url = d.properties?.presignedLastImageUrl;
    if (!ts || !url) continue;
    const prev = last.get(d.deviceId);
    last.set(d.deviceId, ts);
    if (prev === undefined || prev === ts) continue; // first sight or no new event
    try {
      await saveImage(url, d.deviceName, 'event');
    } catch {}
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Notifications.scheduleNotificationAsync({
      content: { title: `Activity: ${d.deviceName}`, body: 'New event saved to your phone.' },
      trigger: null,
    }).catch(() => {});
  }
}
