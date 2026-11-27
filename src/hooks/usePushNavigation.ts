import { useEffect } from 'react';
import { MOCK_MODE } from '../config';
import { navigationRef } from '../navigation/ref';
import { deviceIdFrom, Notifications } from '../services/push';

function openDevice(id: string) {
  const go = () => navigationRef.navigate('CloudDevice', { id });
  if (navigationRef.isReady()) go();
  else {
    const t = setInterval(() => {
      if (navigationRef.isReady()) {
        clearInterval(t);
        go();
      }
    }, 100);
    setTimeout(() => clearInterval(t), 5000);
  }
}

/** Tapping an alert notification opens that device (also when it started the app). */
export function usePushNavigation() {
  useEffect(() => {
    if (MOCK_MODE) return;
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        const id = deviceIdFrom(r);
        if (id) {
          openDevice(id);
          Notifications.clearLastNotificationResponseAsync().catch(() => {});
        }
      })
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const id = deviceIdFrom(r);
      if (id) openDevice(id);
    });
    return () => sub.remove();
  }, []);
}
