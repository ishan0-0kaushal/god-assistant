package expo.modules.tradegatenative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Keeps the kill switch armed across reboots and app updates. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (Prefs.isArmed(context)) GuardService.start(context)
  }
}
