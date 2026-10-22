package expo.modules.steadynative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Keeps limits enforced across reboots and app updates. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (Prefs.isEnabled(context)) GuardService.start(context)
  }
}
